import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const pool = new Pool({
  host: process.env.DB_HOST || "aws-0-ap-northeast-2.pooler.supabase.com",
  port: Number(process.env.DB_PORT || 6543),
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres.jkhvrohsrihmkyxzrhyw",
  password: process.env.DB_PASS || "DisasterReliefSystem",
  ssl: { rejectUnauthorized: false },
  max: 5,
});

function hashPasswordSha256Base64(password: string): string {
  return crypto.createHash("sha256").update(password, "utf8").digest("base64");
}

async function tryForwardToJavaJdbcServer(
  req: NextRequest,
  subpath: string,
  bodyText: string
): Promise<Response | null> {
  const javaBase =
    process.env.JAVA_API_URL ||
    process.env.NEXT_PUBLIC_JAVA_API_URL ||
    "http://127.0.0.1:8080";

  const search = req.nextUrl.search || "";
  const url = `${javaBase.replace(/\/$/, "")}/api/${subpath}${search}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: ["POST", "PUT", "PATCH"].includes(req.method) ? bodyText : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok || res.status === 400 || res.status === 401 || res.status === 409) {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "X-DRRMS-Engine": "Java-JDBC-Server",
        },
      });
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params.path.join("/"));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params.path.join("/"));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params.path.join("/"));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(req, params.path.join("/"));
}

async function handleRequest(req: NextRequest, subpath: string) {
  const bodyText = ["POST", "PUT", "PATCH"].includes(req.method)
    ? await req.text()
    : "";

  // 1. Try forwarding to Java JDBC REST API Server (Render / Localhost)
  const forwarded = await tryForwardToJavaJdbcServer(req, subpath, bodyText);
  if (forwarded) return forwarded;

  // 2. Seamless Direct Supabase PostgreSQL 15 Execution (if Render is cold-starting)
  try {
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (subpath === "health") {
      await pool.query("SELECT 1");
      return NextResponse.json({
        status: "ok",
        database: "connected",
        engine: "Java JDBC + Supabase PostgreSQL 15 (Pooler Port 6543)",
      });
    }

    if (subpath === "auth/login" && req.method === "POST") {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json(
          { error: "Username and password are required." },
          { status: 400 }
        );
      }
      const uRes = await pool.query(
        "SELECT * FROM UserAccount WHERE username = $1",
        [username.trim()]
      );
      if (uRes.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid username or password." },
          { status: 401 }
        );
      }
      const row = uRes.rows[0];
      const storedHash = row.password_hash || row.password || "";
      const inputHash = hashPasswordSha256Base64(password);
      if (storedHash !== inputHash && storedHash !== password) {
        return NextResponse.json(
          { error: "Invalid username or password." },
          { status: 401 }
        );
      }

      const user = {
        userId: row.user_id,
        username: row.username,
        fullName: row.full_name,
        role: row.role,
        contactInfo: row.contact_info || "",
      };

      const resp: any = { user };
      if (row.role === "Donor") {
        const dRes = await pool.query("SELECT * FROM Donor WHERE user_id = $1", [
          row.user_id,
        ]);
        if (dRes.rows[0]) {
          resp.donorId = dRes.rows[0].donor_id;
          resp.donorType = dRes.rows[0].donor_type;
        }
      } else if (row.role === "Organization") {
        const oRes = await pool.query(
          "SELECT * FROM Organization WHERE user_id = $1",
          [row.user_id]
        );
        if (oRes.rows[0]) {
          resp.orgId = oRes.rows[0].org_id;
          resp.orgName = oRes.rows[0].org_name;
          resp.location = oRes.rows[0].location;
        }
      } else if (row.role === "Volunteer") {
        const vRes = await pool.query(
          "SELECT * FROM Volunteer WHERE user_id = $1",
          [row.user_id]
        );
        if (vRes.rows[0]) {
          resp.volunteerId = vRes.rows[0].volunteer_id;
          resp.vehicleType = vRes.rows[0].vehicle_type;
          resp.isAvailable = vRes.rows[0].is_available;
        }
      }
      return NextResponse.json(resp);
    }

    if (subpath === "auth/register" && req.method === "POST") {
      const {
        username,
        password,
        fullName,
        contactInfo,
        role,
        donorType,
        orgName,
        location,
        vehicleType,
      } = body;

      if (!username || !password || !fullName || !role) {
        return NextResponse.json(
          { error: "Missing required registration fields." },
          { status: 400 }
        );
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const dupUser = await client.query(
          "SELECT user_id FROM UserAccount WHERE LOWER(username) = LOWER($1)",
          [username.trim()]
        );
        if (dupUser.rows.length > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Username already exists in Master Registry." },
            { status: 409 }
          );
        }

        if (role === "Organization" && orgName) {
          const dupOrg = await client.query(
            "SELECT org_id FROM Organization WHERE LOWER(org_name) = LOWER($1)",
            [orgName.trim()]
          );
          if (dupOrg.rows.length > 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error:
                  "Duplicate Organization detected in Master Data Registry.",
              },
              { status: 409 }
            );
          }
        }

        const hash = hashPasswordSha256Base64(password);
        const insUser = await client.query(
          "INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [
            username.trim(),
            hash,
            role.trim(),
            fullName.trim(),
            contactInfo ? contactInfo.trim() : "",
          ]
        );
        const newUser = insUser.rows[0];
        const userId = newUser.user_id;

        if (role === "Donor") {
          await client.query(
            "INSERT INTO Donor (user_id, donor_type) VALUES ($1, $2)",
            [userId, donorType || "Individual"]
          );
        } else if (role === "Organization") {
          await client.query(
            "INSERT INTO Organization (user_id, org_name, location) VALUES ($1, $2, $3)",
            [userId, orgName || fullName, location || "Metro Manila"]
          );
        } else if (role === "Volunteer") {
          await client.query(
            "INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES ($1, $2, true)",
            [userId, vehicleType || "Van"]
          );
        }

        await client.query(
          "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
          [
            userId,
            `Welcome to DRRMS! Your ${role} account has been verified under RA 10173 Data Privacy guidelines.`,
          ]
        );

        await client.query("COMMIT");
        return NextResponse.json(
          {
            user: {
              userId: newUser.user_id,
              username: newUser.username,
              fullName: newUser.full_name,
              role: newUser.role,
              contactInfo: newUser.contact_info,
            },
            message: "Account registered successfully.",
          },
          { status: 201 }
        );
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }

    if (subpath === "admin/overview" && req.method === "GET") {
      const [
        eventsRes,
        invRes,
        goodsRes,
        donRes,
        donItemsRes,
        reqRes,
        reqItemsRes,
        delRes,
        volRes,
        orgRes,
        donorRes,
        userRes,
        notifRes,
        rep1Res,
        rep2Res,
        rep3Res,
      ] = await Promise.all([
        pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
        pool.query(
          "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id ORDER BY i.inventory_id"
        ),
        pool.query("SELECT * FROM ReliefGood ORDER BY good_id"),
        pool.query(
          "SELECT d.*, u.full_name as donor_name, e.event_name FROM Donation d JOIN Donor dn ON d.donor_id = dn.donor_id JOIN UserAccount u ON dn.user_id = u.user_id LEFT JOIN DisasterEvent e ON d.event_id = e.event_id ORDER BY d.donation_id DESC"
        ),
        pool.query(
          "SELECT di.*, r.item_name, r.category, r.unit_of_measure FROM DonationItem di JOIN ReliefGood r ON di.good_id = r.good_id"
        ),
        pool.query(
          "SELECT r.*, o.org_name, e.event_name FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id JOIN DisasterEvent e ON r.event_id = e.event_id ORDER BY r.request_id DESC"
        ),
        pool.query(
          "SELECT ri.*, r.item_name, r.category, r.unit_of_measure FROM RequestItem ri JOIN ReliefGood r ON ri.good_id = r.good_id"
        ),
        pool.query(
          "SELECT d.*, u.full_name as volunteer_name, o.org_name, o.location FROM Delivery d LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id LEFT JOIN UserAccount u ON v.user_id = u.user_id JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id ORDER BY d.delivery_id DESC"
        ),
        pool.query(
          "SELECT v.*, u.full_name as volunteer_name FROM Volunteer v JOIN UserAccount u ON v.user_id = u.user_id ORDER BY v.volunteer_id"
        ),
        pool.query("SELECT * FROM Organization ORDER BY org_id"),
        pool.query(
          "SELECT d.*, u.full_name as donor_name FROM Donor d JOIN UserAccount u ON d.user_id = u.user_id ORDER BY d.donor_id"
        ),
        pool.query("SELECT * FROM UserAccount ORDER BY user_id"),
        pool.query(
          "SELECT * FROM Notification ORDER BY date_sent DESC LIMIT 30"
        ),
        pool.query(`
          SELECT e.event_id, e.event_name, e.location, e.status,
                 COUNT(DISTINCT d.donation_id) AS total_donations,
                 COUNT(DISTINCT r.request_id) AS total_requests,
                 COUNT(DISTINCT del.delivery_id) AS total_deliveries
          FROM DisasterEvent e
          LEFT JOIN Donation d ON e.event_id = d.event_id
          LEFT JOIN ReliefRequest r ON e.event_id = r.event_id
          LEFT JOIN Delivery del ON r.request_id = del.request_id
          GROUP BY e.event_id, e.event_name, e.location, e.status
          ORDER BY e.event_id
        `),
        pool.query(`
          SELECT g.good_id, g.item_name, g.category, g.unit_of_measure,
                 COALESCE(i.current_stock, 0) AS current_stock,
                 COALESCE(SUM(di.quantity), 0) AS total_donated_qty,
                 COALESCE(SUM(ri.quantity), 0) AS total_requested_qty,
                 CASE
                     WHEN COALESCE(i.current_stock, 0) <= 200 THEN 'CRITICAL ALERT'
                     WHEN COALESCE(i.current_stock, 0) <= 1000 THEN 'LOW STOCK'
                     ELSE 'SUFFICIENT'
                 END AS stock_health
          FROM ReliefGood g
          LEFT JOIN Inventory i ON g.good_id = i.good_id
          LEFT JOIN DonationItem di ON g.good_id = di.good_id
          LEFT JOIN RequestItem ri ON g.good_id = ri.good_id
          GROUP BY g.good_id, g.item_name, g.category, g.unit_of_measure, i.current_stock
          ORDER BY i.current_stock ASC
        `),
        pool.query(`
          SELECT dn.donor_id, u.full_name AS donor_name, dn.donor_type, u.contact_info,
                 COUNT(DISTINCT d.donation_id) AS total_donations,
                 COUNT(DISTINCT d.event_id) AS events_supported,
                 COALESCE(SUM(di.quantity), 0) AS total_items_donated
          FROM Donor dn
          JOIN UserAccount u ON dn.user_id = u.user_id
          LEFT JOIN Donation d ON dn.donor_id = d.donor_id
          LEFT JOIN DonationItem di ON d.donation_id = di.donation_id
          GROUP BY dn.donor_id, u.full_name, dn.donor_type, u.contact_info
          ORDER BY total_donations DESC
        `),
      ]);

      const donItemsByDonId: Record<number, any[]> = {};
      donItemsRes.rows.forEach((it) => {
        if (!donItemsByDonId[it.donation_id]) donItemsByDonId[it.donation_id] = [];
        donItemsByDonId[it.donation_id].push({
          itemId: it.item_id,
          goodId: it.good_id,
          quantity: it.quantity,
          itemName: it.item_name,
          category: it.category,
          unitOfMeasure: it.unit_of_measure,
        });
      });

      const reqItemsByReqId: Record<number, any[]> = {};
      reqItemsRes.rows.forEach((it) => {
        if (!reqItemsByReqId[it.request_id]) reqItemsByReqId[it.request_id] = [];
        reqItemsByReqId[it.request_id].push({
          requestItemId: it.request_item_id,
          goodId: it.good_id,
          quantity: it.quantity,
          itemName: it.item_name,
          category: it.category,
          unitOfMeasure: it.unit_of_measure,
        });
      });

      const events = eventsRes.rows.map((e) => ({
        eventId: e.event_id,
        eventName: e.event_name,
        location: e.location,
        status: e.status,
        startDate: e.start_date
          ? new Date(e.start_date).toISOString().split("T")[0]
          : "",
      }));

      const donations = donRes.rows.map((d) => ({
        donationId: d.donation_id,
        donorId: d.donor_id,
        eventId: d.event_id,
        donationDate: d.donation_date
          ? new Date(d.donation_date).toISOString().split("T")[0]
          : "",
        status: d.status,
        donorName: d.donor_name,
        eventName: d.event_name || "General Relief Fund",
        items: donItemsByDonId[d.donation_id] || [],
      }));

      const requests = reqRes.rows.map((r) => ({
        requestId: r.request_id,
        orgId: r.org_id,
        eventId: r.event_id,
        requestDate: r.request_date
          ? new Date(r.request_date).toISOString().split("T")[0]
          : "",
        status: r.status,
        orgName: r.org_name,
        eventName: r.event_name,
        items: reqItemsByReqId[r.request_id] || [],
      }));

      const deliveries = delRes.rows.map((d) => ({
        deliveryId: d.delivery_id,
        requestId: d.request_id,
        volunteerId: d.volunteer_id,
        dispatchDate: d.dispatch_date
          ? new Date(d.dispatch_date).toISOString().split("T")[0]
          : "",
        deliveryStatus: d.delivery_status,
        volunteerName: d.volunteer_name || "Unassigned",
        orgName: d.org_name,
        location: d.location,
      }));

      return NextResponse.json({
        metrics: {
          activeDisasters: events.filter((e) => e.status === "Active").length,
          totalDonations: donations.length,
          pendingRequests: requests.filter((r) => r.status === "Pending").length,
          registeredVolunteers: volRes.rows.length,
          completedDeliveries: deliveries.filter(
            (d) => d.deliveryStatus === "Delivered"
          ).length,
          reliefGoodsCount: goodsRes.rows.length,
        },
        events,
        inventory: invRes.rows.map((i) => ({
          inventoryId: i.inventory_id,
          goodId: i.good_id,
          currentStock: i.current_stock,
          itemName: i.item_name,
          category: i.category,
          unitOfMeasure: i.unit_of_measure,
        })),
        goods: goodsRes.rows.map((g) => ({
          goodId: g.good_id,
          itemName: g.item_name,
          category: g.category,
          unitOfMeasure: g.unit_of_measure,
        })),
        donations,
        requests,
        deliveries,
        volunteers: volRes.rows.map((v) => ({
          volunteerId: v.volunteer_id,
          userId: v.user_id,
          vehicleType: v.vehicle_type,
          isAvailable: v.is_available,
          volunteerName: v.volunteer_name,
        })),
        organizations: orgRes.rows.map((o) => ({
          orgId: o.org_id,
          userId: o.user_id,
          orgName: o.org_name,
          location: o.location,
        })),
        donors: donorRes.rows.map((d) => ({
          donorId: d.donor_id,
          userId: d.user_id,
          donorType: d.donor_type,
          donorName: d.donor_name,
        })),
        users: userRes.rows.map((u) => ({
          userId: u.user_id,
          username: u.username,
          fullName: u.full_name,
          role: u.role,
          contactInfo: u.contact_info || "",
        })),
        notifications: notifRes.rows.map((n) => ({
          notificationId: n.notification_id,
          userId: n.user_id,
          message: n.message,
          isRead: n.is_read,
          dateSent: n.date_sent ? new Date(n.date_sent).toISOString() : "",
        })),
        reports: {
          operationalSummary: rep1Res.rows.map((r) => ({
            eventId: r.event_id,
            eventName: r.event_name,
            location: r.location,
            status: r.status,
            totalDonations: Number(r.total_donations),
            totalRequests: Number(r.total_requests),
            totalDeliveries: Number(r.total_deliveries),
          })),
          inventoryHealth: rep2Res.rows.map((r) => ({
            goodId: r.good_id,
            itemName: r.item_name,
            category: r.category,
            currentStockFormatted: `${r.current_stock} ${r.unit_of_measure}`,
            totalDonatedQty: Number(r.total_donated_qty),
            totalRequestedQty: Number(r.total_requested_qty),
            stockHealth: r.stock_health,
          })),
          donorImpact: rep3Res.rows.map((r) => ({
            donorId: r.donor_id,
            donorName: r.donor_name,
            donorType: r.donor_type,
            contactInfo: r.contact_info || "",
            totalDonations: Number(r.total_donations),
            eventsSupported: Number(r.events_supported),
            totalItemsDonated: Number(r.total_items_donated),
          })),
        },
      });
    }

    if (subpath === "portal/donor" && req.method === "GET") {
      const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
      const [uRes, dRes, donRes, eventsRes, goodsRes, invRes, notifRes] =
        await Promise.all([
          pool.query("SELECT * FROM UserAccount WHERE user_id = $1", [userId]),
          pool.query("SELECT * FROM Donor WHERE user_id = $1", [userId]),
          pool.query(
            "SELECT d.*, u.full_name as donor_name, e.event_name FROM Donation d JOIN Donor dn ON d.donor_id = dn.donor_id JOIN UserAccount u ON dn.user_id = u.user_id LEFT JOIN DisasterEvent e ON d.event_id = e.event_id WHERE dn.user_id = $1 ORDER BY d.donation_id DESC",
            [userId]
          ),
          pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
          pool.query("SELECT * FROM ReliefGood ORDER BY good_id"),
          pool.query(
            "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id"
          ),
          pool.query(
            "SELECT * FROM Notification WHERE user_id = $1 ORDER BY date_sent DESC",
            [userId]
          ),
        ]);

      const donItemsRes = await pool.query(
        "SELECT di.*, r.item_name, r.category, r.unit_of_measure FROM DonationItem di JOIN ReliefGood r ON di.good_id = r.good_id"
      );
      const itemsMap: Record<number, any[]> = {};
      donItemsRes.rows.forEach((it) => {
        if (!itemsMap[it.donation_id]) itemsMap[it.donation_id] = [];
        itemsMap[it.donation_id].push({
          itemId: it.item_id,
          goodId: it.good_id,
          quantity: it.quantity,
          itemName: it.item_name,
          category: it.category,
          unitOfMeasure: it.unit_of_measure,
        });
      });

      const u = uRes.rows[0];
      const dn = dRes.rows[0];
      return NextResponse.json({
        user: u
          ? {
              userId: u.user_id,
              username: u.username,
              fullName: u.full_name,
              role: u.role,
              contactInfo: u.contact_info || "",
            }
          : null,
        donor: dn
          ? {
              donorId: dn.donor_id,
              userId: dn.user_id,
              donorType: dn.donor_type,
            }
          : null,
        donations: donRes.rows.map((d) => ({
          donationId: d.donation_id,
          donorId: d.donor_id,
          eventId: d.event_id,
          donationDate: d.donation_date
            ? new Date(d.donation_date).toISOString().split("T")[0]
            : "",
          status: d.status,
          donorName: d.donor_name,
          eventName: d.event_name || "General Relief Fund",
          items: itemsMap[d.donation_id] || [],
        })),
        events: eventsRes.rows.map((e) => ({
          eventId: e.event_id,
          eventName: e.event_name,
          location: e.location,
          status: e.status,
          startDate: e.start_date
            ? new Date(e.start_date).toISOString().split("T")[0]
            : "",
        })),
        goods: goodsRes.rows.map((g) => ({
          goodId: g.good_id,
          itemName: g.item_name,
          category: g.category,
          unitOfMeasure: g.unit_of_measure,
        })),
        inventory: invRes.rows.map((i) => ({
          inventoryId: i.inventory_id,
          goodId: i.good_id,
          currentStock: i.current_stock,
          itemName: i.item_name,
          category: i.category,
          unitOfMeasure: i.unit_of_measure,
        })),
        notifications: notifRes.rows.map((n) => ({
          notificationId: n.notification_id,
          userId: n.user_id,
          message: n.message,
          isRead: n.is_read,
          dateSent: n.date_sent ? new Date(n.date_sent).toISOString() : "",
        })),
      });
    }

    if (subpath === "portal/organization" && req.method === "GET") {
      const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
      const [uRes, oRes, reqRes, delRes, eventsRes, goodsRes, invRes, notifRes] =
        await Promise.all([
          pool.query("SELECT * FROM UserAccount WHERE user_id = $1", [userId]),
          pool.query("SELECT * FROM Organization WHERE user_id = $1", [userId]),
          pool.query(
            "SELECT r.*, o.org_name, e.event_name FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id JOIN DisasterEvent e ON r.event_id = e.event_id WHERE o.user_id = $1 ORDER BY r.request_id DESC",
            [userId]
          ),
          pool.query(
            "SELECT d.*, u.full_name as volunteer_name, o.org_name, o.location FROM Delivery d LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id LEFT JOIN UserAccount u ON v.user_id = u.user_id JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id WHERE o.user_id = $1 ORDER BY d.delivery_id DESC",
            [userId]
          ),
          pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
          pool.query("SELECT * FROM ReliefGood ORDER BY good_id"),
          pool.query(
            "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id"
          ),
          pool.query(
            "SELECT * FROM Notification WHERE user_id = $1 ORDER BY date_sent DESC",
            [userId]
          ),
        ]);

      const reqItemsRes = await pool.query(
        "SELECT ri.*, r.item_name, r.category, r.unit_of_measure FROM RequestItem ri JOIN ReliefGood r ON ri.good_id = r.good_id"
      );
      const itemsMap: Record<number, any[]> = {};
      reqItemsRes.rows.forEach((it) => {
        if (!itemsMap[it.request_id]) itemsMap[it.request_id] = [];
        itemsMap[it.request_id].push({
          requestItemId: it.request_item_id,
          goodId: it.good_id,
          quantity: it.quantity,
          itemName: it.item_name,
          category: it.category,
          unitOfMeasure: it.unit_of_measure,
        });
      });

      const u = uRes.rows[0];
      const o = oRes.rows[0];
      return NextResponse.json({
        user: u
          ? {
              userId: u.user_id,
              username: u.username,
              fullName: u.full_name,
              role: u.role,
              contactInfo: u.contact_info || "",
            }
          : null,
        organization: o
          ? {
              orgId: o.org_id,
              userId: o.user_id,
              orgName: o.org_name,
              location: o.location,
            }
          : null,
        requests: reqRes.rows.map((r) => ({
          requestId: r.request_id,
          orgId: r.org_id,
          eventId: r.event_id,
          requestDate: r.request_date
            ? new Date(r.request_date).toISOString().split("T")[0]
            : "",
          status: r.status,
          orgName: r.org_name,
          eventName: r.event_name,
          items: itemsMap[r.request_id] || [],
        })),
        deliveries: delRes.rows.map((d) => ({
          deliveryId: d.delivery_id,
          requestId: d.request_id,
          volunteerId: d.volunteer_id,
          dispatchDate: d.dispatch_date
            ? new Date(d.dispatch_date).toISOString().split("T")[0]
            : "",
          deliveryStatus: d.delivery_status,
          volunteerName: d.volunteer_name || "Unassigned",
          orgName: d.org_name,
          location: d.location,
        })),
        events: eventsRes.rows.map((e) => ({
          eventId: e.event_id,
          eventName: e.event_name,
          location: e.location,
          status: e.status,
          startDate: e.start_date
            ? new Date(e.start_date).toISOString().split("T")[0]
            : "",
        })),
        goods: goodsRes.rows.map((g) => ({
          goodId: g.good_id,
          itemName: g.item_name,
          category: g.category,
          unitOfMeasure: g.unit_of_measure,
        })),
        inventory: invRes.rows.map((i) => ({
          inventoryId: i.inventory_id,
          goodId: i.good_id,
          currentStock: i.current_stock,
          itemName: i.item_name,
          category: i.category,
          unitOfMeasure: i.unit_of_measure,
        })),
        notifications: notifRes.rows.map((n) => ({
          notificationId: n.notification_id,
          userId: n.user_id,
          message: n.message,
          isRead: n.is_read,
          dateSent: n.date_sent ? new Date(n.date_sent).toISOString() : "",
        })),
      });
    }

    if (subpath === "portal/volunteer" && req.method === "GET") {
      const userId = Number(req.nextUrl.searchParams.get("userId") || 0);
      const [uRes, vRes, delRes, eventsRes, notifRes] = await Promise.all([
        pool.query("SELECT * FROM UserAccount WHERE user_id = $1", [userId]),
        pool.query(
          "SELECT v.*, u.full_name as volunteer_name FROM Volunteer v JOIN UserAccount u ON v.user_id = u.user_id WHERE v.user_id = $1",
          [userId]
        ),
        pool.query(
          "SELECT d.*, u.full_name as volunteer_name, o.org_name, o.location FROM Delivery d JOIN Volunteer v ON d.volunteer_id = v.volunteer_id JOIN UserAccount u ON v.user_id = u.user_id JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id WHERE v.user_id = $1 ORDER BY d.delivery_id DESC",
          [userId]
        ),
        pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
        pool.query(
          "SELECT * FROM Notification WHERE user_id = $1 ORDER BY date_sent DESC",
          [userId]
        ),
      ]);

      const u = uRes.rows[0];
      const v = vRes.rows[0];
      return NextResponse.json({
        user: u
          ? {
              userId: u.user_id,
              username: u.username,
              fullName: u.full_name,
              role: u.role,
              contactInfo: u.contact_info || "",
            }
          : null,
        volunteer: v
          ? {
              volunteerId: v.volunteer_id,
              userId: v.user_id,
              vehicleType: v.vehicle_type,
              isAvailable: v.is_available,
              volunteerName: v.volunteer_name,
            }
          : null,
        deliveries: delRes.rows.map((d) => ({
          deliveryId: d.delivery_id,
          requestId: d.request_id,
          volunteerId: d.volunteer_id,
          dispatchDate: d.dispatch_date
            ? new Date(d.dispatch_date).toISOString().split("T")[0]
            : "",
          deliveryStatus: d.delivery_status,
          volunteerName: d.volunteer_name || "Unassigned",
          orgName: d.org_name,
          location: d.location,
        })),
        events: eventsRes.rows.map((e) => ({
          eventId: e.event_id,
          eventName: e.event_name,
          location: e.location,
          status: e.status,
          startDate: e.start_date
            ? new Date(e.start_date).toISOString().split("T")[0]
            : "",
        })),
        notifications: notifRes.rows.map((n) => ({
          notificationId: n.notification_id,
          userId: n.user_id,
          message: n.message,
          isRead: n.is_read,
          dateSent: n.date_sent ? new Date(n.date_sent).toISOString() : "",
        })),
      });
    }

    if (subpath === "donations") {
      if (req.method === "POST") {
        const { userId, eventId, items } = body;
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const dRes = await client.query(
            "SELECT donor_id FROM Donor WHERE user_id = $1",
            [userId]
          );
          if (dRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Donor profile not found." },
              { status: 400 }
            );
          }
          const donorId = dRes.rows[0].donor_id;
          const insDon = await client.query(
            "INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES ($1, $2, CURRENT_DATE, 'Pending') RETURNING donation_id",
            [donorId, eventId && eventId > 0 ? eventId : null]
          );
          const donationId = insDon.rows[0].donation_id;

          for (const it of items || []) {
            await client.query(
              "INSERT INTO DonationItem (donation_id, good_id, quantity) VALUES ($1, $2, $3)",
              [donationId, it.goodId, it.quantity]
            );
          }

          await client.query(
            "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
            [
              userId,
              `Donation Pledge #${donationId} (${(items || []).length} item types) recorded and awaiting Steward verification.`,
            ]
          );
          await client.query("COMMIT");
          return NextResponse.json({ donationId }, { status: 201 });
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "PUT") {
        const { donationId, status } = body;
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const prevRes = await client.query(
            "SELECT status, donor_id FROM Donation WHERE donation_id = $1",
            [donationId]
          );
          const prevStatus = prevRes.rows[0]?.status;
          const donorId = prevRes.rows[0]?.donor_id;

          await client.query(
            "UPDATE Donation SET status = $1 WHERE donation_id = $2",
            [status, donationId]
          );

          if (status === "Approved" && prevStatus !== "Approved") {
            const itemsRes = await client.query(
              "SELECT good_id, quantity FROM DonationItem WHERE donation_id = $1",
              [donationId]
            );
            for (const it of itemsRes.rows) {
              await client.query(
                "INSERT INTO Inventory (good_id, current_stock) VALUES ($1, $2) ON CONFLICT (good_id) DO UPDATE SET current_stock = Inventory.current_stock + EXCLUDED.current_stock",
                [it.good_id, it.quantity]
              );
            }
          }

          if (donorId) {
            const uRes = await client.query(
              "SELECT user_id FROM Donor WHERE donor_id = $1",
              [donorId]
            );
            if (uRes.rows[0]) {
              await client.query(
                "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
                [
                  uRes.rows[0].user_id,
                  `Your Donation #${donationId} status has been updated to: ${status}.`,
                ]
              );
            }
          }

          await client.query("COMMIT");
          return NextResponse.json({ updated: true });
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        await pool.query("DELETE FROM Donation WHERE donation_id = $1", [id]);
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "requests") {
      if (req.method === "POST") {
        const { userId, eventId, items } = body;
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const oRes = await client.query(
            "SELECT org_id FROM Organization WHERE user_id = $1",
            [userId]
          );
          if (oRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Organization profile not found." },
              { status: 400 }
            );
          }
          const orgId = oRes.rows[0].org_id;
          const insReq = await client.query(
            "INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES ($1, $2, CURRENT_DATE, 'Pending') RETURNING request_id",
            [orgId, eventId]
          );
          const requestId = insReq.rows[0].request_id;

          for (const it of items || []) {
            await client.query(
              "INSERT INTO RequestItem (request_id, good_id, quantity) VALUES ($1, $2, $3)",
              [requestId, it.goodId, it.quantity]
            );
          }

          await client.query(
            "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
            [
              userId,
              `Relief Request #${requestId} submitted and queued for Steward review.`,
            ]
          );
          await client.query("COMMIT");
          return NextResponse.json({ requestId }, { status: 201 });
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "PUT") {
        const { requestId, status } = body;
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const prevRes = await client.query(
            "SELECT status, org_id FROM ReliefRequest WHERE request_id = $1",
            [requestId]
          );
          const prevStatus = prevRes.rows[0]?.status;
          const orgId = prevRes.rows[0]?.org_id;

          if (status === "Approved" && prevStatus === "Pending") {
            const itemsRes = await client.query(
              "SELECT good_id, quantity FROM RequestItem WHERE request_id = $1",
              [requestId]
            );
            for (const it of itemsRes.rows) {
              await client.query(
                "UPDATE Inventory SET current_stock = GREATEST(0, current_stock - $1) WHERE good_id = $2",
                [it.quantity, it.good_id]
              );
            }
          }

          await client.query(
            "UPDATE ReliefRequest SET status = $1 WHERE request_id = $2",
            [status, requestId]
          );

          if (orgId) {
            const uRes = await client.query(
              "SELECT user_id FROM Organization WHERE org_id = $1",
              [orgId]
            );
            if (uRes.rows[0]) {
              await client.query(
                "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
                [
                  uRes.rows[0].user_id,
                  `Relief Request #${requestId} status updated to: ${status}.`,
                ]
              );
            }
          }

          await client.query("COMMIT");
          return NextResponse.json({ updated: true });
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        await pool.query("DELETE FROM ReliefRequest WHERE request_id = $1", [
          id,
        ]);
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "deliveries") {
      if (req.method === "POST") {
        const { requestId, volunteerId, deliveryStatus } = body;
        await pool.query(
          "INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES ($1, $2, CURRENT_DATE, $3)",
          [requestId, volunteerId || null, deliveryStatus || "In Transit"]
        );
        if (volunteerId) {
          const vRes = await pool.query(
            "SELECT user_id FROM Volunteer WHERE volunteer_id = $1",
            [volunteerId]
          );
          if (vRes.rows[0]) {
            await pool.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                vRes.rows[0].user_id,
                `New Dispatch Assignment: You have been assigned to Relief Request #${requestId}.`,
              ]
            );
          }
        }
        return NextResponse.json({ created: true }, { status: 201 });
      } else if (req.method === "PUT") {
        const { deliveryId, deliveryStatus } = body;
        await pool.query(
          "UPDATE Delivery SET delivery_status = $1 WHERE delivery_id = $2",
          [deliveryStatus, deliveryId]
        );
        if (deliveryStatus === "Delivered") {
          await pool.query(
            "UPDATE ReliefRequest SET status = 'Fulfilled' WHERE request_id = (SELECT request_id FROM Delivery WHERE delivery_id = $1)",
            [deliveryId]
          );
        }
        return NextResponse.json({ updated: true });
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        await pool.query("DELETE FROM Delivery WHERE delivery_id = $1", [id]);
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "events") {
      if (req.method === "POST") {
        const { eventName, location, status, startDate } = body;
        await pool.query(
          "INSERT INTO DisasterEvent (event_name, location, status, start_date) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE))",
          [eventName, location, status || "Active", startDate || null]
        );
        return NextResponse.json({ created: true }, { status: 201 });
      } else if (req.method === "PUT") {
        const { eventId, status } = body;
        await pool.query(
          "UPDATE DisasterEvent SET status = $1 WHERE event_id = $2",
          [status, eventId]
        );
        return NextResponse.json({ updated: true });
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        await pool.query("DELETE FROM DisasterEvent WHERE event_id = $1", [id]);
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "inventory") {
      if (req.method === "POST") {
        const { itemName, category, unitOfMeasure, currentStock } = body;
        const gRes = await pool.query(
          "INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES ($1, $2, $3) RETURNING good_id",
          [itemName, category, unitOfMeasure]
        );
        const goodId = gRes.rows[0].good_id;
        await pool.query(
          "INSERT INTO Inventory (good_id, current_stock) VALUES ($1, $2)",
          [goodId, Number(currentStock || 0)]
        );
        return NextResponse.json({ created: true }, { status: 201 });
      } else if (req.method === "PUT") {
        const { inventoryId, currentStock } = body;
        await pool.query(
          "UPDATE Inventory SET current_stock = $1 WHERE inventory_id = $2",
          [Number(currentStock), inventoryId]
        );
        return NextResponse.json({ updated: true });
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        await pool.query(
          "DELETE FROM ReliefGood WHERE good_id = (SELECT good_id FROM Inventory WHERE inventory_id = $1)",
          [id]
        );
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "volunteer/profile" && req.method === "PUT") {
      const { userId, fullName, contactInfo, vehicleType, isAvailable } = body;
      if (fullName && contactInfo !== undefined) {
        await pool.query(
          "UPDATE UserAccount SET full_name = $1, contact_info = $2 WHERE user_id = $3",
          [fullName, contactInfo, userId]
        );
      }
      await pool.query(
        "INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET vehicle_type = EXCLUDED.vehicle_type, is_available = EXCLUDED.is_available",
        [userId, vehicleType || "Van", Boolean(isAvailable)]
      );
      return NextResponse.json({ updated: true });
    }

    if (subpath === "notifications/read" && req.method === "PUT") {
      const { notificationId } = body;
      await pool.query(
        "UPDATE Notification SET is_read = true WHERE notification_id = $1",
        [notificationId]
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: `Unknown endpoint /api/${subpath}` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("API Proxy Error:", err);
    return NextResponse.json(
      { error: err.message || "Database error" },
      { status: 500 }
    );
  }
}

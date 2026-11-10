import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";
import { isEmailConfigured, sendVerificationOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const pool = new Pool({
  host: process.env.DB_HOST || "aws-0-ap-south-1.pooler.supabase.com",
  port: Number(process.env.DB_PORT || 6543),
  database: process.env.DB_NAME || "postgres",
  user: process.env.DB_USER || "postgres.sfcynookqsnhuamosvvq",
  password: process.env.DB_PASS || "renzAldrean",
  ssl: { rejectUnauthorized: false },
  max: 5,
});

function hashPasswordSha256Base64(password: string): string {
  return crypto.createHash("sha256").update(password, "utf8").digest("base64");
}

function hashOtpCode(email: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code}`, "utf8")
    .digest("hex");
}

function constantTimeHexEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  if (!email || email.length > 255 || /[\r\n\s]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

let verificationSchemaReady: Promise<void> | null = null;
function ensureVerificationSchema(): Promise<void> {
  if (!verificationSchemaReady) {
    verificationSchemaReady = (async () => {
      await pool.query(
        "ALTER TABLE UserAccount ADD COLUMN IF NOT EXISTS email VARCHAR(255)"
      );
      await pool.query(
        "ALTER TABLE UserAccount ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT true"
      );
      await pool.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_useraccount_email_unique ON UserAccount (LOWER(email)) WHERE email IS NOT NULL"
      );
      await pool.query(`
        CREATE TABLE IF NOT EXISTS PendingVerification (
          verification_id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(50) NOT NULL,
          code_hash VARCHAR(128) NOT NULL,
          payload_json TEXT NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    })().catch((err) => {
      verificationSchemaReady = null;
      throw err;
    });
  }
  return verificationSchemaReady;
}

const NEXTJS_HANDLED_ENDPOINTS = new Set([
  "auth/register",
  "auth/verify-email",
  "auth/resend-otp",
]);

function normalizeSelfRegisterRole(
  raw: unknown
): "Donor" | "Organization" | "Volunteer" | null {
  if (typeof raw !== "string") return null;
  const r = raw.trim().toLowerCase();
  if (r === "donor") return "Donor";
  if (r === "organization") return "Organization";
  if (r === "volunteer") return "Volunteer";
  return null;
}

function normalizeDonationStatus(raw: unknown): "Pending" | "Approved" | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "approved") return "Approved";
  return null;
}

function normalizeRequestStatus(
  raw: unknown
): "Pending" | "Approved" | "Fulfilled" | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "approved") return "Approved";
  if (s === "fulfilled") return "Fulfilled";
  return null;
}

function normalizeDeliveryStatus(
  raw: unknown
): "Pending" | "In Transit" | "Delivered" | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "in transit") return "In Transit";
  if (s === "delivered") return "Delivered";
  return null;
}

function normalizeEventStatus(raw: unknown): "Active" | "Resolved" | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (s === "active") return "Active";
  if (s === "resolved") return "Resolved";
  return null;
}

function mergeLineItems(rawItems: unknown): { goodId: number; quantity: number }[] {
  if (!Array.isArray(rawItems)) return [];
  const merged = new Map<number, number>();
  for (const item of rawItems) {
    const goodId = Number((item as any)?.goodId);
    const quantity = Number((item as any)?.quantity);
    if (
      Number.isInteger(goodId) &&
      goodId > 0 &&
      Number.isInteger(quantity) &&
      quantity > 0
    ) {
      merged.set(goodId, (merged.get(goodId) || 0) + quantity);
    }
  }
  return Array.from(merged.entries()).map(([goodId, quantity]) => ({
    goodId,
    quantity,
  }));
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
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const res = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: ["POST", "PUT", "PATCH"].includes(req.method) ? bodyText : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const isJson = (res.headers.get("content-type") || "").includes(
      "application/json"
    );
    if (
      res.ok ||
      ([400, 401, 403, 404, 405, 409].includes(res.status) && isJson)
    ) {
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

  // 1. Try forwarding to Java JDBC REST API Server (Render / Localhost),
  //    except email OTP endpoints which use Next.js Nodemailer SMTP directly.
  if (!NEXTJS_HANDLED_ENDPOINTS.has(subpath)) {
    const forwarded = await tryForwardToJavaJdbcServer(req, subpath, bodyText);
    if (forwarded) return forwarded;
  }

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
      await ensureVerificationSchema();
      const { username, password } = body;
      if (
        typeof username !== "string" ||
        !username.trim() ||
        typeof password !== "string" ||
        !password
      ) {
        return NextResponse.json(
          { error: "Username or email and password are required." },
          { status: 400 }
        );
      }
      const identifier = username.trim();
      const uRes = await pool.query(
        "SELECT * FROM UserAccount WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($1))",
        [identifier]
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

      if (row.is_verified === false) {
        return NextResponse.json(
          {
            error:
              "Please verify your email address before signing in.",
          },
          { status: 403 }
        );
      }

      const user = {
        userId: row.user_id,
        username: row.username,
        fullName: row.full_name,
        role: row.role,
        contactInfo: row.contact_info || "",
        email: row.email || "",
        isVerified: row.is_verified !== false,
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
      await ensureVerificationSchema();
      const {
        username,
        email: rawEmail,
        password,
        fullName,
        contactInfo,
        role: rawRole,
        donorType,
        orgName,
        location,
        vehicleType,
      } = body;

      if (
        typeof username !== "string" ||
        !username.trim() ||
        typeof password !== "string" ||
        !password ||
        typeof fullName !== "string" ||
        !fullName.trim() ||
        !rawRole
      ) {
        return NextResponse.json(
          { error: "Missing required registration fields." },
          { status: 400 }
        );
      }

      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 50 || /[\s@]/.test(trimmedUsername)) {
        return NextResponse.json(
          {
            error:
              "Username must be 3-50 characters and cannot contain spaces or '@'.",
          },
          { status: 400 }
        );
      }

      if (!isValidEmail(rawEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address for verification." },
          { status: 400 }
        );
      }
      const normalizedEmail = rawEmail.trim().toLowerCase();

      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      const role = normalizeSelfRegisterRole(rawRole);
      if (!role) {
        return NextResponse.json(
          {
            error:
              "Self-registration is restricted to Donor, Organization, or Volunteer roles.",
          },
          { status: 400 }
        );
      }

      if (!isEmailConfigured()) {
        return NextResponse.json(
          {
            error:
              "Email verification is not configured on the server yet (missing SMTP_USER / SMTP_PASS in Vercel Environment Variables).",
          },
          { status: 503 }
        );
      }

      const safeDonorType =
        String(donorType || "").trim().toLowerCase() === "corporate"
          ? "Corporate"
          : "Individual";

      const dupUser = await pool.query(
        "SELECT user_id, username, email FROM UserAccount WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2))",
        [trimmedUsername, normalizedEmail]
      );
      if (dupUser.rows.length > 0) {
        const hit = dupUser.rows[0];
        if ((hit.email || "").toLowerCase() === normalizedEmail) {
          return NextResponse.json(
            { error: "An account with this email address already exists." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Username already exists in Master Registry." },
          { status: 409 }
        );
      }

      if (role === "Organization" && typeof orgName === "string" && orgName.trim()) {
        const dupOrg = await pool.query(
          "SELECT org_id FROM Organization WHERE LOWER(org_name) = LOWER($1)",
          [orgName.trim()]
        );
        if (dupOrg.rows.length > 0) {
          return NextResponse.json(
            {
              error:
                "Duplicate Organization detected in Master Data Registry.",
            },
            { status: 409 }
          );
        }
      }

      const existingPending = await pool.query(
        "SELECT email, EXTRACT(EPOCH FROM (NOW() - updated_at)) AS elapsed_sec FROM PendingVerification WHERE email = $1",
        [normalizedEmail]
      );
      if (
        existingPending.rows.length > 0 &&
        Number(existingPending.rows[0].elapsed_sec) < 30
      ) {
        const waitSec = Math.max(
          1,
          Math.ceil(30 - Number(existingPending.rows[0].elapsed_sec))
        );
        return NextResponse.json(
          {
            error: `A verification code was just sent. Please wait ${waitSec}s before requesting another code.`,
          },
          { status: 429 }
        );
      }

      const otpCode = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
      const codeHash = hashOtpCode(normalizedEmail, otpCode);
      const pendingPayload = {
        username: trimmedUsername,
        passwordHash: hashPasswordSha256Base64(password),
        fullName: fullName.trim(),
        contactInfo: typeof contactInfo === "string" ? contactInfo.trim() : "",
        role,
        donorType: safeDonorType,
        orgName:
          typeof orgName === "string" && orgName.trim()
            ? orgName.trim()
            : fullName.trim(),
        location:
          typeof location === "string" && location.trim()
            ? location.trim()
            : "Metro Manila",
        vehicleType:
          typeof vehicleType === "string" && vehicleType.trim()
            ? vehicleType.trim()
            : "Van",
      };

      await pool.query(
        `INSERT INTO PendingVerification (email, username, code_hash, payload_json, attempts, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, NOW() + INTERVAL '10 minutes', NOW())
         ON CONFLICT (email) DO UPDATE SET
           username = EXCLUDED.username,
           code_hash = EXCLUDED.code_hash,
           payload_json = EXCLUDED.payload_json,
           attempts = 0,
           expires_at = NOW() + INTERVAL '10 minutes',
           updated_at = NOW()`,
        [
          normalizedEmail,
          trimmedUsername,
          codeHash,
          JSON.stringify(pendingPayload),
        ]
      );

      try {
        await sendVerificationOtpEmail({
          toEmail: normalizedEmail,
          fullName: pendingPayload.fullName,
          username: pendingPayload.username,
          role: pendingPayload.role,
          code: otpCode,
        });
      } catch (mailErr: any) {
        await pool.query("DELETE FROM PendingVerification WHERE email = $1", [
          normalizedEmail,
        ]);
        console.error("Failed to send OTP email:", mailErr?.message || mailErr);
        return NextResponse.json(
          {
            error:
              "Failed to send verification email via SMTP. Please verify SMTP_USER and Gmail App Password (SMTP_PASS) settings.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          pendingVerification: true,
          email: normalizedEmail,
          expiresInMinutes: 10,
          message: `We sent a 6-digit verification code to ${normalizedEmail}.`,
        },
        { status: 202 }
      );
    }

    if (subpath === "auth/resend-otp" && req.method === "POST") {
      await ensureVerificationSchema();
      const { email: rawEmail } = body;
      if (!isValidEmail(rawEmail)) {
        return NextResponse.json(
          { error: "Valid email address is required." },
          { status: 400 }
        );
      }
      const normalizedEmail = rawEmail.trim().toLowerCase();

      if (!isEmailConfigured()) {
        return NextResponse.json(
          {
            error:
              "Email verification is not configured on the server yet (missing SMTP_USER / SMTP_PASS).",
          },
          { status: 503 }
        );
      }

      const pendingRes = await pool.query(
        "SELECT *, EXTRACT(EPOCH FROM (NOW() - updated_at)) AS elapsed_sec FROM PendingVerification WHERE email = $1",
        [normalizedEmail]
      );
      if (pendingRes.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              "No pending registration found for this email. Please fill out the Create Account form first.",
          },
          { status: 404 }
        );
      }

      const row = pendingRes.rows[0];
      const elapsed = Number(row.elapsed_sec || 0);
      if (elapsed < 45) {
        const retryAfterSeconds = Math.max(1, Math.ceil(45 - elapsed));
        return NextResponse.json(
          {
            error: `Please wait ${retryAfterSeconds}s before requesting a new code.`,
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      const payload = JSON.parse(row.payload_json);
      const otpCode = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
      const codeHash = hashOtpCode(normalizedEmail, otpCode);

      await pool.query(
        "UPDATE PendingVerification SET code_hash = $1, attempts = 0, expires_at = NOW() + INTERVAL '10 minutes', updated_at = NOW() WHERE email = $2",
        [codeHash, normalizedEmail]
      );

      try {
        await sendVerificationOtpEmail({
          toEmail: normalizedEmail,
          fullName: payload.fullName,
          username: payload.username,
          role: payload.role,
          code: otpCode,
        });
      } catch (mailErr: any) {
        console.error("Failed to resend OTP email:", mailErr?.message || mailErr);
        return NextResponse.json(
          {
            error:
              "Could not resend verification email. Check SMTP_USER / SMTP_PASS settings.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        sent: true,
        email: normalizedEmail,
        message: `A new 6-digit verification code has been sent to ${normalizedEmail}.`,
      });
    }

    if (subpath === "auth/verify-email" && req.method === "POST") {
      await ensureVerificationSchema();
      const { email: rawEmail, code: rawCode } = body;
      if (!isValidEmail(rawEmail)) {
        return NextResponse.json(
          { error: "Valid email address is required." },
          { status: 400 }
        );
      }
      const code = typeof rawCode === "string" ? rawCode.trim() : "";
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "Please enter the exact 6-digit numeric verification code." },
          { status: 400 }
        );
      }
      const normalizedEmail = rawEmail.trim().toLowerCase();

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const pendRes = await client.query(
          "SELECT *, (expires_at < NOW()) AS is_expired FROM PendingVerification WHERE email = $1 FOR UPDATE",
          [normalizedEmail]
        );
        if (pendRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              error:
                "No pending verification found for this email. Please submit the registration form again.",
            },
            { status: 404 }
          );
        }

        const pending = pendRes.rows[0];
        if (pending.is_expired) {
          await client.query(
            "DELETE FROM PendingVerification WHERE verification_id = $1",
            [pending.verification_id]
          );
          await client.query("COMMIT");
          return NextResponse.json(
            {
              error:
                "Your verification code has expired. Please request a new registration.",
            },
            { status: 400 }
          );
        }

        if (Number(pending.attempts) >= 5) {
          await client.query(
            "DELETE FROM PendingVerification WHERE verification_id = $1",
            [pending.verification_id]
          );
          await client.query("COMMIT");
          return NextResponse.json(
            {
              error:
                "Too many invalid attempts. Please restart registration for a fresh code.",
            },
            { status: 429 }
          );
        }

        const expectedHash = pending.code_hash;
        const providedHash = hashOtpCode(normalizedEmail, code);
        if (!constantTimeHexEquals(expectedHash, providedHash)) {
          const nextAttempts = Number(pending.attempts) + 1;
          if (nextAttempts >= 5) {
            await client.query(
              "DELETE FROM PendingVerification WHERE verification_id = $1",
              [pending.verification_id]
            );
            await client.query("COMMIT");
            return NextResponse.json(
              {
                error:
                  "Too many invalid attempts (5/5). Please restart registration to get a new code.",
              },
              { status: 429 }
            );
          }
          await client.query(
            "UPDATE PendingVerification SET attempts = $1 WHERE verification_id = $2",
            [nextAttempts, pending.verification_id]
          );
          await client.query("COMMIT");
          const remaining = 5 - nextAttempts;
          return NextResponse.json(
            {
              error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
            },
            { status: 400 }
          );
        }

        const p = JSON.parse(pending.payload_json);
        const dupUser = await client.query(
          "SELECT user_id FROM UserAccount WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2))",
          [p.username, normalizedEmail]
        );
        if (dupUser.rows.length > 0) {
          await client.query(
            "DELETE FROM PendingVerification WHERE verification_id = $1",
            [pending.verification_id]
          );
          await client.query("COMMIT");
          return NextResponse.json(
            { error: "Username or email is already registered." },
            { status: 409 }
          );
        }

        if (p.role === "Organization" && p.orgName) {
          const dupOrg = await client.query(
            "SELECT org_id FROM Organization WHERE LOWER(org_name) = LOWER($1)",
            [p.orgName]
          );
          if (dupOrg.rows.length > 0) {
            await client.query(
              "DELETE FROM PendingVerification WHERE verification_id = $1",
              [pending.verification_id]
            );
            await client.query("COMMIT");
            return NextResponse.json(
              {
                error:
                  "Duplicate Organization detected in Master Data Registry.",
              },
              { status: 409 }
            );
          }
        }

        const insUser = await client.query(
          "INSERT INTO UserAccount (username, password_hash, role, full_name, contact_info, email, is_verified) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *",
          [
            p.username,
            p.passwordHash,
            p.role,
            p.fullName,
            p.contactInfo || "",
            normalizedEmail,
          ]
        );
        const newUser = insUser.rows[0];
        const userId = newUser.user_id;

        const resp: any = {
          user: {
            userId: newUser.user_id,
            username: newUser.username,
            fullName: newUser.full_name,
            role: newUser.role,
            contactInfo: newUser.contact_info || "",
            email: newUser.email || normalizedEmail,
            isVerified: true,
          },
          message: "Email verified and account created successfully.",
        };

        if (p.role === "Donor") {
          const dIns = await client.query(
            "INSERT INTO Donor (user_id, donor_type) VALUES ($1, $2) RETURNING *",
            [userId, p.donorType === "Corporate" ? "Corporate" : "Individual"]
          );
          resp.donorId = dIns.rows[0].donor_id;
          resp.donorType = dIns.rows[0].donor_type;
        } else if (p.role === "Organization") {
          const oIns = await client.query(
            "INSERT INTO Organization (user_id, org_name, location) VALUES ($1, $2, $3) RETURNING *",
            [userId, p.orgName || p.fullName, p.location || "Metro Manila"]
          );
          resp.orgId = oIns.rows[0].org_id;
          resp.orgName = oIns.rows[0].org_name;
          resp.location = oIns.rows[0].location;
        } else if (p.role === "Volunteer") {
          const vIns = await client.query(
            "INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES ($1, $2, true) RETURNING *",
            [userId, p.vehicleType || "Van"]
          );
          resp.volunteerId = vIns.rows[0].volunteer_id;
          resp.vehicleType = vIns.rows[0].vehicle_type;
          resp.isAvailable = vIns.rows[0].is_available;
        }

        await client.query(
          "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
          [
            userId,
            `Welcome to DRRMS! Your ${p.role} account (${normalizedEmail}) has been verified under RA 10173 Data Privacy guidelines.`,
          ]
        );

        await client.query(
          "DELETE FROM PendingVerification WHERE verification_id = $1",
          [pending.verification_id]
        );

        await client.query("COMMIT");
        return NextResponse.json(resp, { status: 201 });
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
          "SELECT di.*, r.item_name, r.category, r.unit_of_measure FROM DonationItem di JOIN ReliefGood r ON di.good_id = r.good_id ORDER BY di.item_id"
        ),
        pool.query(
          "SELECT r.*, o.org_name, e.event_name FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id JOIN DisasterEvent e ON r.event_id = e.event_id ORDER BY r.request_id DESC"
        ),
        pool.query(
          "SELECT ri.*, r.item_name, r.category, r.unit_of_measure FROM RequestItem ri JOIN ReliefGood r ON ri.good_id = r.good_id ORDER BY ri.request_item_id"
        ),
        pool.query(
          "SELECT d.*, u.full_name as volunteer_name, u.contact_info as volunteer_contact, v.vehicle_type, o.org_name, o.location, e.event_name FROM Delivery d LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id LEFT JOIN UserAccount u ON v.user_id = u.user_id JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id LEFT JOIN DisasterEvent e ON r.event_id = e.event_id ORDER BY d.delivery_id DESC"
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
        volunteerContact: d.volunteer_contact || "",
        vehicleType: d.vehicle_type || "",
        orgName: d.org_name,
        location: d.location,
        eventName: d.event_name || "",
        items: reqItemsByReqId[d.request_id] || [],
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
          email: u.email || "",
          isVerified: u.is_verified !== false,
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
      const [uRes, dRes, donRes, donItemsRes, eventsRes, goodsRes, invRes, notifRes] =
        await Promise.all([
          pool.query("SELECT * FROM UserAccount WHERE user_id = $1", [userId]),
          pool.query("SELECT * FROM Donor WHERE user_id = $1", [userId]),
          pool.query(
            "SELECT d.*, u.full_name as donor_name, e.event_name FROM Donation d JOIN Donor dn ON d.donor_id = dn.donor_id JOIN UserAccount u ON dn.user_id = u.user_id LEFT JOIN DisasterEvent e ON d.event_id = e.event_id WHERE dn.user_id = $1 ORDER BY d.donation_id DESC",
            [userId]
          ),
          pool.query(
            "SELECT di.*, r.item_name, r.category, r.unit_of_measure FROM DonationItem di JOIN ReliefGood r ON di.good_id = r.good_id JOIN Donation d ON di.donation_id = d.donation_id JOIN Donor dn ON d.donor_id = dn.donor_id WHERE dn.user_id = $1 ORDER BY di.item_id",
            [userId]
          ),
          pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
          pool.query("SELECT * FROM ReliefGood ORDER BY good_id"),
          pool.query(
            "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id ORDER BY i.inventory_id"
          ),
          pool.query(
            "SELECT * FROM Notification WHERE user_id = $1 ORDER BY date_sent DESC LIMIT 50",
            [userId]
          ),
        ]);

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
      const [
        uRes,
        oRes,
        reqRes,
        reqItemsRes,
        delRes,
        eventsRes,
        goodsRes,
        invRes,
        notifRes,
      ] = await Promise.all([
        pool.query("SELECT * FROM UserAccount WHERE user_id = $1", [userId]),
        pool.query("SELECT * FROM Organization WHERE user_id = $1", [userId]),
        pool.query(
          "SELECT r.*, o.org_name, e.event_name FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id JOIN DisasterEvent e ON r.event_id = e.event_id WHERE o.user_id = $1 ORDER BY r.request_id DESC",
          [userId]
        ),
        pool.query(
          "SELECT ri.*, r.item_name, r.category, r.unit_of_measure FROM RequestItem ri JOIN ReliefGood r ON ri.good_id = r.good_id JOIN ReliefRequest req ON ri.request_id = req.request_id JOIN Organization o ON req.org_id = o.org_id WHERE o.user_id = $1 ORDER BY ri.request_item_id",
          [userId]
        ),
        pool.query(
          "SELECT d.*, u.full_name as volunteer_name, u.contact_info as volunteer_contact, v.vehicle_type, o.org_name, o.location, e.event_name FROM Delivery d LEFT JOIN Volunteer v ON d.volunteer_id = v.volunteer_id LEFT JOIN UserAccount u ON v.user_id = u.user_id JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id LEFT JOIN DisasterEvent e ON r.event_id = e.event_id WHERE o.user_id = $1 ORDER BY d.delivery_id DESC",
          [userId]
        ),
        pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
        pool.query("SELECT * FROM ReliefGood ORDER BY good_id"),
        pool.query(
          "SELECT i.inventory_id, i.good_id, i.current_stock, r.item_name, r.category, r.unit_of_measure FROM Inventory i JOIN ReliefGood r ON i.good_id = r.good_id ORDER BY i.inventory_id"
        ),
        pool.query(
          "SELECT * FROM Notification WHERE user_id = $1 ORDER BY date_sent DESC LIMIT 50",
          [userId]
        ),
      ]);

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
          volunteerContact: d.volunteer_contact || "",
          vehicleType: d.vehicle_type || "",
          orgName: d.org_name,
          location: d.location,
          eventName: d.event_name || "",
          items: itemsMap[d.request_id] || [],
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
      const [uRes, vRes, delRes, reqItemsRes, eventsRes, notifRes] = await Promise.all([
        pool.query("SELECT * FROM UserAccount WHERE user_id = $1", [userId]),
        pool.query(
          "SELECT v.*, u.full_name as volunteer_name FROM Volunteer v JOIN UserAccount u ON v.user_id = u.user_id WHERE v.user_id = $1",
          [userId]
        ),
        pool.query(
          "SELECT d.*, u.full_name as volunteer_name, u.contact_info as volunteer_contact, v.vehicle_type, o.org_name, o.location, e.event_name FROM Delivery d JOIN Volunteer v ON d.volunteer_id = v.volunteer_id JOIN UserAccount u ON v.user_id = u.user_id JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id LEFT JOIN DisasterEvent e ON r.event_id = e.event_id WHERE v.user_id = $1 ORDER BY d.delivery_id DESC",
          [userId]
        ),
        pool.query(
          "SELECT ri.*, rg.item_name, rg.category, rg.unit_of_measure FROM RequestItem ri JOIN ReliefGood rg ON ri.good_id = rg.good_id JOIN Delivery d ON ri.request_id = d.request_id JOIN Volunteer v ON d.volunteer_id = v.volunteer_id WHERE v.user_id = $1 ORDER BY ri.request_item_id",
          [userId]
        ),
        pool.query("SELECT * FROM DisasterEvent ORDER BY event_id DESC"),
        pool.query(
          "SELECT * FROM Notification WHERE user_id = $1 ORDER BY date_sent DESC LIMIT 50",
          [userId]
        ),
      ]);

      const volItemsMap: Record<number, any[]> = {};
      reqItemsRes.rows.forEach((it) => {
        if (!volItemsMap[it.request_id]) volItemsMap[it.request_id] = [];
        volItemsMap[it.request_id].push({
          requestItemId: it.request_item_id,
          goodId: it.good_id,
          quantity: it.quantity,
          itemName: it.item_name,
          category: it.category,
          unitOfMeasure: it.unit_of_measure,
        });
      });

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
          volunteerContact: d.volunteer_contact || "",
          vehicleType: d.vehicle_type || "",
          orgName: d.org_name,
          location: d.location,
          eventName: d.event_name || "",
          items: volItemsMap[d.request_id] || [],
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
        const userId = Number(body.userId);
        const eventId = body.eventId ? Number(body.eventId) : null;
        const items = mergeLineItems(body.items);

        if (!Number.isInteger(userId) || userId <= 0) {
          return NextResponse.json(
            { error: "Valid userId is required." },
            { status: 400 }
          );
        }
        if (items.length === 0) {
          return NextResponse.json(
            { error: "At least one valid donation item (quantity > 0) is required." },
            { status: 400 }
          );
        }

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
              { error: "Donor profile not found for userId." },
              { status: 400 }
            );
          }
          if (eventId && eventId > 0) {
            const evRes = await client.query(
              "SELECT status FROM DisasterEvent WHERE event_id = $1",
              [eventId]
            );
            if (evRes.rows.length === 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "Selected disaster event does not exist." },
                { status: 400 }
              );
            }
            if ((evRes.rows[0].status || "").toLowerCase() !== "active") {
              await client.query("ROLLBACK");
              return NextResponse.json(
                {
                  error:
                    "Selected disaster event is resolved. Please select an Active disaster or General Relief Fund.",
                },
                { status: 400 }
              );
            }
          }

          const goodIds = items.map((it) => it.goodId);
          const gCheck = await client.query(
            "SELECT good_id FROM ReliefGood WHERE good_id = ANY($1::int[])",
            [goodIds]
          );
          if (gCheck.rows.length !== goodIds.length) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error:
                  "One or more selected relief items are no longer in the catalog. Please refresh.",
              },
              { status: 400 }
            );
          }

          const donorId = dRes.rows[0].donor_id;
          const insDon = await client.query(
            "INSERT INTO Donation (donor_id, event_id, donation_date, status) VALUES ($1, $2, CURRENT_DATE, 'Pending') RETURNING donation_id",
            [donorId, eventId && eventId > 0 ? eventId : null]
          );
          const donationId = insDon.rows[0].donation_id;

          for (const it of items) {
            await client.query(
              "INSERT INTO DonationItem (donation_id, good_id, quantity) VALUES ($1, $2, $3)",
              [donationId, it.goodId, it.quantity]
            );
          }

          await client.query(
            "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
            [
              userId,
              `Donation Pledge ${donationId} (${items.length} item types) recorded and awaiting review.`,
            ]
          );
          await client.query("COMMIT");
          return NextResponse.json(
            { donationId, message: "Donation submitted atomically." },
            { status: 201 }
          );
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "PUT") {
        const donationId = Number(body.donationId);
        const status = normalizeDonationStatus(body.status);
        if (!Number.isInteger(donationId) || donationId <= 0 || !status) {
          return NextResponse.json(
            { error: "Valid donationId and status (Pending or Approved) are required." },
            { status: 400 }
          );
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const prevRes = await client.query(
            "SELECT status, donor_id FROM Donation WHERE donation_id = $1 FOR UPDATE",
            [donationId]
          );
          if (prevRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Donation not found." },
              { status: 404 }
            );
          }
          const prevStatus = prevRes.rows[0].status;
          const donorId = prevRes.rows[0].donor_id;

          await client.query(
            "UPDATE Donation SET status = $1 WHERE donation_id = $2",
            [status, donationId]
          );

          if (status === "Approved" && prevStatus !== "Approved") {
            const itemsRes = await client.query(
              "SELECT good_id, SUM(quantity) AS total_qty FROM DonationItem WHERE donation_id = $1 GROUP BY good_id",
              [donationId]
            );
            for (const it of itemsRes.rows) {
              await client.query(
                "INSERT INTO Inventory (good_id, current_stock) VALUES ($1, $2) ON CONFLICT (good_id) DO UPDATE SET current_stock = Inventory.current_stock + EXCLUDED.current_stock",
                [it.good_id, Number(it.total_qty)]
              );
            }
          }

          const uRes = await client.query(
            "SELECT user_id FROM Donor WHERE donor_id = $1",
            [donorId]
          );
          if (uRes.rows[0]) {
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                uRes.rows[0].user_id,
                `Your Donation ${donationId} status has been updated to: ${status}.`,
              ]
            );
          }

          await client.query("COMMIT");
          return NextResponse.json({
            message: "Donation status updated and warehouse inventory synchronized.",
          });
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        const ownerUserId = Number(req.nextUrl.searchParams.get("userId") || 0);
        const onlyPending =
          req.nextUrl.searchParams.get("onlyPending") === "true";

        if (!Number.isInteger(id) || id <= 0) {
          return NextResponse.json(
            { error: "Valid donation id is required." },
            { status: 400 }
          );
        }

        if (onlyPending || ownerUserId > 0) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const checkRes = await client.query(
              "SELECT d.status, dn.user_id FROM Donation d JOIN Donor dn ON d.donor_id = dn.donor_id WHERE d.donation_id = $1 FOR UPDATE",
              [id]
            );
            if (checkRes.rows.length === 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "Donation not found." },
                { status: 404 }
              );
            }
            const row = checkRes.rows[0];
            if (ownerUserId > 0 && Number(row.user_id) !== ownerUserId) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "You can only cancel your own donations." },
                { status: 403 }
              );
            }
            if (
              onlyPending &&
              String(row.status || "").toLowerCase() !== "pending"
            ) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                {
                  error:
                    "Only pending donations can be cancelled. Approved pledges are already credited to warehouse inventory.",
                },
                { status: 409 }
              );
            }
            await client.query(
              "DELETE FROM Donation WHERE donation_id = $1",
              [id]
            );
            await client.query("COMMIT");
            return NextResponse.json({ deleted: true });
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          } finally {
            client.release();
          }
        }

        const del = await pool.query(
          "DELETE FROM Donation WHERE donation_id = $1",
          [id]
        );
        if (del.rowCount === 0) {
          return NextResponse.json(
            { error: "Donation not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "requests") {
      if (req.method === "POST") {
        const userId = Number(body.userId);
        const eventId = Number(body.eventId);
        const items = mergeLineItems(body.items);

        if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(eventId) || eventId <= 0) {
          return NextResponse.json(
            { error: "Valid userId and eventId are required." },
            { status: 400 }
          );
        }
        if (items.length === 0) {
          return NextResponse.json(
            { error: "At least one requested relief item (quantity > 0) is required." },
            { status: 400 }
          );
        }

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
              { error: "Organization profile not found for userId." },
              { status: 400 }
            );
          }
          const evRes = await client.query(
            "SELECT event_name, status FROM DisasterEvent WHERE event_id = $1",
            [eventId]
          );
          if (evRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Selected disaster event does not exist." },
              { status: 400 }
            );
          }
          if (String(evRes.rows[0].status || "").toLowerCase() !== "active") {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error:
                  "Selected disaster event is resolved. Please select an Active disaster.",
              },
              { status: 400 }
            );
          }
          const eventName = evRes.rows[0].event_name || `Event ${eventId}`;

          for (const it of items) {
            const goodChk = await client.query(
              "SELECT 1 FROM ReliefGood WHERE good_id = $1",
              [it.goodId]
            );
            if (goodChk.rows.length === 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                {
                  error:
                    "One or more selected relief items are no longer in the catalog. Please refresh.",
                },
                { status: 400 }
              );
            }
          }

          const orgId = oRes.rows[0].org_id;
          const insReq = await client.query(
            "INSERT INTO ReliefRequest (org_id, event_id, request_date, status) VALUES ($1, $2, CURRENT_DATE, 'Pending') RETURNING request_id",
            [orgId, eventId]
          );
          const requestId = insReq.rows[0].request_id;

          for (const it of items) {
            await client.query(
              "INSERT INTO RequestItem (request_id, good_id, quantity) VALUES ($1, $2, $3)",
              [requestId, it.goodId, it.quantity]
            );
          }

          await client.query(
            "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
            [
              userId,
              `Relief Request ${requestId} submitted for ${eventName} and queued for Steward review.`,
            ]
          );
          await client.query("COMMIT");
          return NextResponse.json(
            { requestId, message: "Relief request submitted atomically." },
            { status: 201 }
          );
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "PUT") {
        const requestId = Number(body.requestId);
        const status = normalizeRequestStatus(body.status);
        if (!Number.isInteger(requestId) || requestId <= 0 || !status) {
          return NextResponse.json(
            {
              error:
                "Valid requestId and status (Pending, Approved, or Fulfilled) are required.",
            },
            { status: 400 }
          );
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const prevRes = await client.query(
            "SELECT status, org_id FROM ReliefRequest WHERE request_id = $1 FOR UPDATE",
            [requestId]
          );
          if (prevRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Relief request not found." },
              { status: 404 }
            );
          }
          const prevStatus = prevRes.rows[0].status;
          const orgId = prevRes.rows[0].org_id;

          if (
            prevStatus === "Pending" &&
            (status === "Approved" || status === "Fulfilled")
          ) {
            const itemsRes = await client.query(
              "SELECT ri.good_id, SUM(ri.quantity) AS total_qty, g.item_name, g.unit_of_measure FROM RequestItem ri JOIN ReliefGood g ON ri.good_id = g.good_id WHERE ri.request_id = $1 GROUP BY ri.good_id, g.item_name, g.unit_of_measure ORDER BY ri.good_id",
              [requestId]
            );

            for (const it of itemsRes.rows) {
              const reqQty = Number(it.total_qty);
              const invRes = await client.query(
                "SELECT current_stock FROM Inventory WHERE good_id = $1 FOR UPDATE",
                [it.good_id]
              );
              const available = invRes.rows[0]?.current_stock ?? 0;
              if (invRes.rows.length === 0 || available < reqQty) {
                await client.query("ROLLBACK");
                return NextResponse.json(
                  {
                    error: `Insufficient warehouse stock for ${it.item_name}: requested ${reqQty} ${it.unit_of_measure}, available ${available} ${it.unit_of_measure}.`,
                  },
                  { status: 400 }
                );
              }

              await client.query(
                "UPDATE Inventory SET current_stock = current_stock - $1 WHERE good_id = $2",
                [reqQty, it.good_id]
              );
            }
          }

          await client.query(
            "UPDATE ReliefRequest SET status = $1 WHERE request_id = $2",
            [status, requestId]
          );

          const uRes = await client.query(
            "SELECT user_id FROM Organization WHERE org_id = $1",
            [orgId]
          );
          if (uRes.rows[0]) {
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                uRes.rows[0].user_id,
                `Relief Request ${requestId} status updated to: ${status}.`,
              ]
            );
          }

          await client.query("COMMIT");
          return NextResponse.json({
            message: "Request status updated and inventory adjusted atomically.",
          });
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        const ownerUserId = Number(req.nextUrl.searchParams.get("userId") || 0);
        const onlyPending =
          req.nextUrl.searchParams.get("onlyPending") === "true";

        if (!Number.isInteger(id) || id <= 0) {
          return NextResponse.json(
            { error: "Valid request id is required." },
            { status: 400 }
          );
        }

        if (onlyPending || ownerUserId > 0) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const checkRes = await client.query(
              "SELECT r.status, o.user_id FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id WHERE r.request_id = $1 FOR UPDATE",
              [id]
            );
            if (checkRes.rows.length === 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "Relief request not found." },
                { status: 404 }
              );
            }
            const row = checkRes.rows[0];
            if (ownerUserId > 0 && Number(row.user_id) !== ownerUserId) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "You can only cancel your own relief requests." },
                { status: 403 }
              );
            }
            if (
              onlyPending &&
              String(row.status || "").toLowerCase() !== "pending"
            ) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                {
                  error:
                    "Only pending requests can be cancelled. Approved or fulfilled requests are already allocated.",
                },
                { status: 409 }
              );
            }
            const delCheck = await client.query(
              "SELECT delivery_id FROM Delivery WHERE request_id = $1 LIMIT 1",
              [id]
            );
            if (delCheck.rows.length > 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                {
                  error:
                    "Cannot cancel a request that already has a delivery dispatch.",
                },
                { status: 409 }
              );
            }
            await client.query(
              "DELETE FROM ReliefRequest WHERE request_id = $1",
              [id]
            );
            await client.query("COMMIT");
            return NextResponse.json({ deleted: true });
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          } finally {
            client.release();
          }
        }

        const del = await pool.query(
          "DELETE FROM ReliefRequest WHERE request_id = $1",
          [id]
        );
        if (del.rowCount === 0) {
          return NextResponse.json(
            { error: "Relief request not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "deliveries") {
      if (req.method === "POST") {
        const requestId = Number(body.requestId);
        const volunteerId = body.volunteerId ? Number(body.volunteerId) : null;
        const deliveryStatus =
          body.deliveryStatus && String(body.deliveryStatus).trim()
            ? normalizeDeliveryStatus(body.deliveryStatus)
            : "In Transit";

        if (!Number.isInteger(requestId) || requestId <= 0 || !deliveryStatus) {
          return NextResponse.json(
            { error: "Valid requestId and deliveryStatus are required." },
            { status: 400 }
          );
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const reqRes = await client.query(
            "SELECT r.status, o.user_id FROM ReliefRequest r JOIN Organization o ON r.org_id = o.org_id WHERE r.request_id = $1 FOR UPDATE",
            [requestId]
          );
          if (reqRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Relief request not found." },
              { status: 404 }
            );
          }
          const reqStatus = reqRes.rows[0].status;
          const orgUserId = reqRes.rows[0].user_id;
          if (reqStatus !== "Approved") {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error: `Only Approved relief requests can be dispatched (Request ${requestId} is ${reqStatus}).`,
              },
              { status: 400 }
            );
          }

          const existingDel = await client.query(
            "SELECT delivery_id FROM Delivery WHERE request_id = $1 LIMIT 1",
            [requestId]
          );
          if (existingDel.rows.length > 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error: `Request ${requestId} already has a delivery assignment (Delivery ${existingDel.rows[0].delivery_id}).`,
              },
              { status: 409 }
            );
          }

          let volUserId: number | null = null;
          if (volunteerId && volunteerId > 0) {
            const vRes = await client.query(
              "SELECT user_id FROM Volunteer WHERE volunteer_id = $1",
              [volunteerId]
            );
            if (vRes.rows.length === 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "Assigned volunteer not found." },
                { status: 404 }
              );
            }
            volUserId = vRes.rows[0].user_id;
          }

          const insDel = await client.query(
            "INSERT INTO Delivery (request_id, volunteer_id, dispatch_date, delivery_status) VALUES ($1, $2, CURRENT_DATE, $3) RETURNING delivery_id",
            [requestId, volunteerId && volunteerId > 0 ? volunteerId : null, deliveryStatus]
          );
          const deliveryId = insDel.rows[0].delivery_id;

          if (volUserId) {
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                volUserId,
                `New Dispatch Assignment (Delivery ${deliveryId}): You have been assigned to Relief Request ${requestId}.`,
              ]
            );
          }

          if (deliveryStatus === "In Transit") {
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                orgUserId,
                `Delivery ${deliveryId} for Relief Request ${requestId} has been dispatched and is now In Transit.`,
              ]
            );
          } else if (deliveryStatus === "Delivered") {
            await client.query(
              "UPDATE ReliefRequest SET status = 'Fulfilled' WHERE request_id = $1",
              [requestId]
            );
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                orgUserId,
                `Delivery ${deliveryId} for Relief Request ${requestId} has been delivered.`,
              ]
            );
          }

          await client.query("COMMIT");
          return NextResponse.json(
            { created: true, deliveryId },
            { status: 201 }
          );
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "PUT") {
        const deliveryId = Number(body.deliveryId);
        const deliveryStatus = normalizeDeliveryStatus(body.deliveryStatus);
        if (!Number.isInteger(deliveryId) || deliveryId <= 0 || !deliveryStatus) {
          return NextResponse.json(
            {
              error:
                "Valid deliveryId and deliveryStatus (Pending, In Transit, or Delivered) are required.",
            },
            { status: 400 }
          );
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const checkRes = await client.query(
            "SELECT d.delivery_status, d.request_id, o.user_id FROM Delivery d JOIN ReliefRequest r ON d.request_id = r.request_id JOIN Organization o ON r.org_id = o.org_id WHERE d.delivery_id = $1 FOR UPDATE",
            [deliveryId]
          );
          if (checkRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Delivery not found." },
              { status: 404 }
            );
          }
          const prevStatus = checkRes.rows[0].delivery_status;
          const requestId = checkRes.rows[0].request_id;
          const orgUserId = checkRes.rows[0].user_id;

          if (
            String(prevStatus || "").toLowerCase() === "delivered" &&
            deliveryStatus !== "Delivered"
          ) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error:
                  "Delivered shipments cannot be reverted to an earlier status.",
              },
              { status: 409 }
            );
          }

          await client.query(
            "UPDATE Delivery SET delivery_status = $1 WHERE delivery_id = $2",
            [deliveryStatus, deliveryId]
          );

          if (
            deliveryStatus === "In Transit" &&
            String(prevStatus || "").toLowerCase() !== "in transit"
          ) {
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                orgUserId,
                `Delivery ${deliveryId} for Relief Request ${requestId} is now In Transit.`,
              ]
            );
          } else if (
            deliveryStatus === "Delivered" &&
            String(prevStatus || "").toLowerCase() !== "delivered"
          ) {
            await client.query(
              "UPDATE ReliefRequest SET status = 'Fulfilled' WHERE request_id = $1",
              [requestId]
            );
            await client.query(
              "INSERT INTO Notification (user_id, message, is_read) VALUES ($1, $2, false)",
              [
                orgUserId,
                `Delivery ${deliveryId} for Relief Request ${requestId} has arrived and is marked Fulfilled.`,
              ]
            );
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
        if (!Number.isInteger(id) || id <= 0) {
          return NextResponse.json(
            { error: "Valid delivery id is required." },
            { status: 400 }
          );
        }
        const del = await pool.query(
          "DELETE FROM Delivery WHERE delivery_id = $1",
          [id]
        );
        if (del.rowCount === 0) {
          return NextResponse.json(
            { error: "Delivery not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "events") {
      if (req.method === "POST") {
        const { eventName, location, status: rawStatus, startDate } = body;
        const status =
          rawStatus && String(rawStatus).trim()
            ? normalizeEventStatus(rawStatus)
            : "Active";
        if (
          typeof eventName !== "string" ||
          !eventName.trim() ||
          typeof location !== "string" ||
          !location.trim() ||
          !status
        ) {
          return NextResponse.json(
            {
              error:
                "Event name, location, and valid status (Active or Resolved) are required.",
            },
            { status: 400 }
          );
        }
        const ins = await pool.query(
          "INSERT INTO DisasterEvent (event_name, location, status, start_date) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE)) RETURNING event_id",
          [eventName.trim(), location.trim(), status, startDate || null]
        );
        return NextResponse.json(
          { created: true, eventId: ins.rows[0].event_id },
          { status: 201 }
        );
      } else if (req.method === "PUT") {
        const eventId = Number(body.eventId);
        const status = normalizeEventStatus(body.status);
        if (!Number.isInteger(eventId) || eventId <= 0 || !status) {
          return NextResponse.json(
            { error: "Valid eventId and status (Active or Resolved) are required." },
            { status: 400 }
          );
        }
        const upd = await pool.query(
          "UPDATE DisasterEvent SET status = $1 WHERE event_id = $2",
          [status, eventId]
        );
        if (upd.rowCount === 0) {
          return NextResponse.json(
            { error: "Disaster event not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ updated: true });
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        if (!Number.isInteger(id) || id <= 0) {
          return NextResponse.json(
            { error: "Valid event id is required." },
            { status: 400 }
          );
        }
        const del = await pool.query(
          "DELETE FROM DisasterEvent WHERE event_id = $1",
          [id]
        );
        if (del.rowCount === 0) {
          return NextResponse.json(
            { error: "Disaster event not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "inventory") {
      if (req.method === "POST") {
        const { itemName, category, unitOfMeasure, currentStock } = body;
        const stock = Number(currentStock ?? 0);
        if (
          typeof itemName !== "string" ||
          !itemName.trim() ||
          typeof category !== "string" ||
          !category.trim() ||
          typeof unitOfMeasure !== "string" ||
          !unitOfMeasure.trim()
        ) {
          return NextResponse.json(
            { error: "Item name, category, and unit of measure are required." },
            { status: 400 }
          );
        }
        if (!Number.isInteger(stock) || stock < 0) {
          return NextResponse.json(
            { error: "Opening stock cannot be negative." },
            { status: 400 }
          );
        }
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const gRes = await client.query(
            "INSERT INTO ReliefGood (item_name, category, unit_of_measure) VALUES ($1, $2, $3) RETURNING good_id",
            [itemName.trim(), category.trim(), unitOfMeasure.trim()]
          );
          const goodId = gRes.rows[0].good_id;
          await client.query(
            "INSERT INTO Inventory (good_id, current_stock) VALUES ($1, $2)",
            [goodId, stock]
          );
          await client.query("COMMIT");
          return NextResponse.json(
            { created: true, goodId },
            { status: 201 }
          );
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      } else if (req.method === "PUT") {
        const inventoryId = Number(body.inventoryId);
        const newStock = Number(body.currentStock);
        if (
          !Number.isInteger(inventoryId) ||
          inventoryId <= 0 ||
          !Number.isInteger(newStock) ||
          newStock < 0
        ) {
          return NextResponse.json(
            {
              error:
                "Valid inventoryId and non-negative integer currentStock are required.",
            },
            { status: 400 }
          );
        }
        const upd = await pool.query(
          "UPDATE Inventory SET current_stock = $1 WHERE inventory_id = $2",
          [newStock, inventoryId]
        );
        if (upd.rowCount === 0) {
          return NextResponse.json(
            { error: "Inventory record not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ updated: true });
      } else if (req.method === "DELETE") {
        const id = Number(req.nextUrl.searchParams.get("id") || 0);
        if (!Number.isInteger(id) || id <= 0) {
          return NextResponse.json(
            { error: "Valid inventory id is required." },
            { status: 400 }
          );
        }
        const del = await pool.query(
          "DELETE FROM ReliefGood WHERE good_id = (SELECT good_id FROM Inventory WHERE inventory_id = $1)",
          [id]
        );
        if (del.rowCount === 0) {
          return NextResponse.json(
            { error: "Inventory record not found." },
            { status: 404 }
          );
        }
        return NextResponse.json({ deleted: true });
      }
    }

    if (subpath === "volunteer/profile" && req.method === "PUT") {
      const userId = Number(body.userId);
      const { fullName, contactInfo, vehicleType, isAvailable } = body;
      if (!Number.isInteger(userId) || userId <= 0) {
        return NextResponse.json(
          { error: "Valid userId is required." },
          { status: 400 }
        );
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (typeof fullName === "string" && fullName.trim() && contactInfo !== undefined) {
          await client.query(
            "UPDATE UserAccount SET full_name = $1, contact_info = $2 WHERE user_id = $3",
            [fullName.trim(), String(contactInfo).trim(), userId]
          );
        }
        await client.query(
          "INSERT INTO Volunteer (user_id, vehicle_type, is_available) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET vehicle_type = EXCLUDED.vehicle_type, is_available = EXCLUDED.is_available",
          [
            userId,
            typeof vehicleType === "string" && vehicleType.trim()
              ? vehicleType.trim()
              : "Van",
            Boolean(isAvailable),
          ]
        );
        await client.query("COMMIT");
        return NextResponse.json({ updated: true });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }

    if (
      subpath === "notifications/read" &&
      (req.method === "PUT" || req.method === "POST")
    ) {
      const markAll = Boolean(body.markAll);
      const userId = Number(body.userId || 0);
      if (markAll) {
        if (!Number.isInteger(userId) || userId <= 0) {
          return NextResponse.json(
            { error: "Valid userId is required to mark all notifications read." },
            { status: 400 }
          );
        }
        await pool.query(
          "UPDATE Notification SET is_read = true WHERE user_id = $1 AND is_read = false",
          [userId]
        );
        return NextResponse.json({ ok: true, markAll: true });
      }

      const notificationId = Number(body.notificationId);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return NextResponse.json(
          { error: "Valid notificationId is required." },
          { status: 400 }
        );
      }
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

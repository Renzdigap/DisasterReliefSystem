FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Copy JDBC driver and Java source files
COPY lib ./lib
COPY src ./src

# Compile all Java classes (Models, DAOs, Utils, and HTTP REST ApiServer)
RUN mkdir -p bin && \
    find src/main/java -name "*.java" > sources.txt && \
    javac -encoding UTF-8 -cp "lib/postgresql-42.7.3.jar" -d bin @sources.txt

EXPOSE 8080

# Run the Java JDBC HTTP REST API Server
CMD ["java", "-cp", "bin:lib/postgresql-42.7.3.jar", "disasterrelief.api.ApiServer"]

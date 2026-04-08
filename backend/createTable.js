const { DynamoDBClient, CreateTableCommand, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function run() {
    try {
        const params = {
            TableName: "Attendance-db",
            KeySchema: [
                { AttributeName: "email", KeyType: "HASH" }
            ],
            AttributeDefinitions: [
                { AttributeName: "email", AttributeType: "S" }
            ],
            BillingMode: "PAY_PER_REQUEST" 
        };
        
        console.log("Creating table Attendance-db...");
        const command = new CreateTableCommand(params);
        const response = await client.send(command);
        console.log("Table created successfully! Status:", response.TableDescription.TableStatus);
        
        console.log("Waiting for table to become active (this may take a few seconds)...");
        await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: "Attendance-db" });
        console.log("Table 'Attendance-db' is now ACTIVE and ready to use!");
        
    } catch (err) {
        if (err.name === 'ResourceInUseException') {
            console.log("Table already exists!");
        } else {
            console.error("Error creating table:", err);
        }
    }
}
run();

const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
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
        const response = await client.send(new ListTablesCommand({}));
        console.log("Tables:", response.TableNames);
    } catch (err) {
        console.error(err);
    }
}
run();

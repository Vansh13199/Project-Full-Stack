const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function createTables() {
    const sessionsParams = {
        TableName: 'Attendance-Sessions',
        KeySchema: [
            { AttributeName: 'sessionId', KeyType: 'HASH' } // Partition Key
        ],
        AttributeDefinitions: [
            { AttributeName: 'sessionId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    };

    const logsParams = {
        TableName: 'Attendance-Logs',
        KeySchema: [
            { AttributeName: 'sessionId', KeyType: 'HASH' }, // Partition Key
            { AttributeName: 'studentEmail', KeyType: 'RANGE' } // Sort Key
        ],
        AttributeDefinitions: [
            { AttributeName: 'sessionId', AttributeType: 'S' },
            { AttributeName: 'studentEmail', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    };

    try {
        console.log('Creating Attendance-Sessions table...');
        await client.send(new CreateTableCommand(sessionsParams));
        console.log('Attendance-Sessions table created successfully.');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Attendance-Sessions table already exists.');
        } else {
            console.error('Error creating Attendance-Sessions table:', error);
        }
    }

    try {
        console.log('Creating Attendance-Logs table...');
        await client.send(new CreateTableCommand(logsParams));
        console.log('Attendance-Logs table created successfully.');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Attendance-Logs table already exists.');
        } else {
            console.error('Error creating Attendance-Logs table:', error);
        }
    }
}

createTables();

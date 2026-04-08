const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function createSubjectsTable() {
    const params = {
        TableName: 'Subjects',
        KeySchema: [
            { AttributeName: 'subjectId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'subjectId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    };

    try {
        console.log('Creating Subjects table...');
        await client.send(new CreateTableCommand(params));
        console.log('Subjects table created successfully.');
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Subjects table already exists.');
        } else {
            console.error('Error creating Subjects table:', error);
        }
    }
}

createSubjectsTable();

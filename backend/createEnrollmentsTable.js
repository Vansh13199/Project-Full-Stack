const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const createEnrollmentsTable = async () => {
    const params = {
        TableName: 'Attendance-Enrollments',
        KeySchema: [
            { AttributeName: 'subjectId', KeyType: 'HASH' },
            { AttributeName: 'studentEmail', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'subjectId', AttributeType: 'S' },
            { AttributeName: 'studentEmail', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        const data = await client.send(new CreateTableCommand(params));
        console.log('Attendance-Enrollments table created successfully:', data);
    } catch (err) {
        if (err.name === 'ResourceInUseException') {
            console.log('Table already exists.');
        } else {
            console.error('Error creating table:', err);
        }
    }
};

createEnrollmentsTable();

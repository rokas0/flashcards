const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const bucketName = 'anki-at-rokaso.com';
const simpleParser = require('mailparser').simpleParser;

exports.handler = async (event) => {
    console.log(JSON.stringify(event));
    var sesNotification = event.Records[0].ses;

    const data = await s3.getObject({
            Bucket: bucketName,
            Key: sesNotification.mail.messageId
        }).promise();

    let parsed = await simpleParser(data.Body);

    var params = {
        MessageBody: JSON.stringify({ text: parsed.text, subject: parsed.subject }),
        QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/815840080813/flashcard-process',
    };

    const resultSqs = await sqs.sendMessage(params).promise();

    // TODO Return actual response to SES
    const response = {
        statusCode: 200,
        body: JSON.stringify(resultSqs),
    };
    return response;
};

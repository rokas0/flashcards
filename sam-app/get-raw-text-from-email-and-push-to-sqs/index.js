'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const bucketName = 'anki-at-rokaso.com';
const simpleParser = require('mailparser').simpleParser;
const htmlToText = require('html-to-text');

exports.handler = async (event) => {
    console.log(JSON.stringify(event));
    var sesNotification = event.Records[0].ses;

    const data = await s3.getObject({
            Bucket: bucketName,
            Key: sesNotification.mail.messageId
        }).promise();

    let parsed = await simpleParser(data.Body);
 
    const textEmail = htmlToText.fromString(parsed.html, {
        wordwrap: false
    });

    var params = {
        MessageBody: JSON.stringify({ text: textEmail, subject: parsed.subject }),
        QueueUrl: process.env.SQS_FLASHCARDS_CSV,
    };

    const resultSqs = await sqs.sendMessage(params).promise();
    console.log(resultSqs);
};

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

let response;
const getDeckName = subject => (['', 'default'].includes(subject.trim().toLowerCase()) ? 'Default' : subject);

const convertTripleHyphenSeparatedStringToArray = inputString => inputString.split('---');

const convertNewLineSeparatedStringToArray = inputString => inputString.split('\n');


exports.handler = async (event) => {
	console.log(event);

	const body = JSON.parse(event.Records[0].body);
	const text = body.text;
	const input = convertNewLineSeparatedStringToArray(text)
		.map(line => convertTripleHyphenSeparatedStringToArray(line));

	const deck = getDeckName(body.subject); // TODO Update this to get from the event

	console.log(input);

	await Promise.all(input.map(card => {
		const side0 = card[0];
		const side1 = (typeof card[1] === 'undefined' || card[1].length === 0 ? ' ' : card[1]);
		if (side0) {
			const row = {
				side0,
				side1,
				deck
			};

			let params = {
				MessageBody: JSON.stringify(row),
				QueueUrl: process.env.SQS_FLASHCARD_JSON,
			};
			console.log(params);
			return sqs.sendMessage(params).promise();
		}
		return null;
	}));

	return response;
};

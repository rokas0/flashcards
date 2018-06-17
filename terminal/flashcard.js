'use strict';

//const addcards = require('./addcards');
const winston = require('winston');
const uuidv1 = require('uuid/v1');
/*
TODO:
    Run Slack bot to add words and post to DynamoDB
    Sync DynamoDB words to personal Anki

TODO:
    1. Normal adding using --- separator (Default)
    2. Adding English phrases with auto IPA translation. So add "Over the moon" and in background it (1) Requests API for each word in parallel for IPA (2) Saves whole sentence as backside

    PSEUDO CODE:

    # GET IPA
    LOOP THROUGH PHRASE GETTING A WORD
        GET OXFORD DICTIONARY API PHRASE
        EXTRACT IPA
        LOG FAILURES
        ADD IPA TO THE FINAL STRING

    # GET MEANING
    GET OXFORD DICTIONARY API BY INPUT
    IF FOUND
        RETURN MEANING's
    IF NOT FOUND 404
        GET OXFORD DICTIONARY API SEARCH
        GET OXFORD DICTIONARY API AGAIN

    How entry looks like?
        keep dic (default english)
        keep cards [--deck] [--separator "---" [Default is new line]]

------------------------
    1. Setup Container Slack bot to receive input as API
    2. Make Node app to sync with Anki upon entering it
*/
const argv = require('yargs') // eslint-disable-line
    .command('add', 'Adds the card', (yargs) => {
        yargs
            .positional('card', {
                describe: 'text separated by triple dashes ---',
            });
    }, (argv) => {
        if (argv.verbose) console.info(`Adding card ${argv.card}`);
        addcards(argv);
    }) 
    .option('deck', {
        alias: 'd',
        default: 'Default',
    })
    .option('port', {
        alias: 'p',
        default: 'Default',
    })
    .option('verbose', {
        alias: 'v',
        default: false,
    })
    .argv;

const request = require('request-promise');
const debug = require('debug')('flashcards');

const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1',
});

const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.File({ filename: 'application_flashcards.log' }),
    ],
});
logger.add(new winston.transports.Console({
    format: winston.format.simple(),
}));

const ddb = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
});
const table = 'flashcards';
const syncSavePeriodMs = 500;
const ankiServerUrl = 'http://localhost:8764';

// TECHDEBT: Add loading from config
// TECHDEBT: Move adding card to other module

const readline = require('readline');

let timeLast = new Date().getTime();
const stackFlashcards = [];
let timeNow;

function saveFlashcardsToDynamoDb() {
    const json = {
        RequestItems: {
            flashcards: [],
        },
    };

    stackFlashcards.forEach((input) => {
        const flashcardSides = input.split('---');
        const frontSide = flashcardSides[0];
        const backSide = flashcardSides.slice(1).join('---');

        if (frontSide) {
            debug(`Debug: ${frontSide}---${backSide} `);
            const addNoteData = {
                PutRequest: {
                    Item: {
                        id: {
                            S: uuidv1(),
                        },
                        frontSide: {
                            S: frontSide,
                        },
                        backSide: {
                            S: backSide,
                        },
                        tags: {
                            S: 'os_flashcards',
                        },
                        timeAdded: {
                            S: new Date().toString(),
                        },
                    },
                },
            };
            json.RequestItems.flashcards.push(addNoteData);
        }
    });

    if (json.RequestItems.flashcards.length < 1) {
        // Too little items. Not syncing
    } else if (json.RequestItems.flashcards.length > 25) {
        console.log('Too many cards. Cannot sync with DynamoDb');
    } else {
        ddb.batchWriteItem(json, (err, data) => {
            if (err) {
                console.log('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
                logger.log('error', 'Unable to add item.', json.RequestItems.flashcards, err);
            } else {
                logger.log('info', 'Items added to DynamoDB', json.RequestItems.flashcards, data);
            }
        });
    }
}

function getDeckName() {
    if (typeof argv.d !== 'undefined') {
        return argv.d;
    } else if (typeof argv.deck !== 'undefined') {
        return argv.deck;
    }
    return 'Default';
}

function saveFlashcards() {
    saveFlashcardsToDynamoDb();

    // Save cards to Anki
    const jsonFlashcards = {
        action: 'addNotes',
        version: 5,
        params: {
            notes: [],
        },
    };

    stackFlashcards.forEach((input) => {
        const flashcardSides = input.split('---');
        const frontSide = flashcardSides[0];
        const backSide = flashcardSides.slice(1).join('---');
        const addNoteData = {
            deckName: getDeckName(),
            modelName: 'Basic',
            fields: {
                Front: frontSide,
                Back: backSide,
            },
            tags: [
                'os_flashcards',
            ],
        };

        jsonFlashcards.params.notes.push(addNoteData);
    });

    logger.log('info', 'Saving cards to Anki', jsonFlashcards);
    stackFlashcards.splice(0, stackFlashcards.length);
    request({
        uri: ankiServerUrl,
        method: 'POST',
        json: true,
        body: jsonFlashcards,
    }).then((body) => {
        if (body.err) {
            throw new Error('Failed response from Anki while adding cards. Message ' + body.err);
        }
        if (body.result.length > 0) {
            logger.info('Cards added succesfully', body);
        } else {
            logger.info('Success but no new cards added', body);            
        }
    }).catch((err) => {
        logger.error('Adding cards to Anki failed', err);
    });
}


function syncFlashcardsAnkiWeb() {
    console.log('Syncing with AnkiWeb');

    request({
        uri: ankiServerUrl,
        method: 'POST',
        json: true,
        body: JSON.stringify({
            action: 'sync',
            version: 5,
        }),
    }).then((body) => {
        if (body.err) {
            throw new Error('Failed response from Anki while syncing cards. Message ' + body.err);
        }
        logger.info('Cards synced succesfully', body);
    }).catch((err) => {
        logger.error('Syncing cards to Anki failed', err);
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


const recursiveAsyncReadLine = function () {
    rl.question('Card: ', (input) => {
        if (input === 'exit') {
            return rl.close();
        }
        stackFlashcards.push(input);
        timeNow = new Date().getTime();
        if (timeNow - timeLast > syncSavePeriodMs) {
            saveFlashcards();
            timeLast = timeNow;
        }
        recursiveAsyncReadLine();
    });
};

recursiveAsyncReadLine();

function exitHandler(options, err) {
    saveFlashcards();
    syncFlashcardsAnkiWeb();

    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) console.log('EXIT');
}

/*
process.on('exit', exitHandler.bind(null, { cleanup: true }));
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
*/

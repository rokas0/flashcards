const Flashcard = require('../models').Flashcard;
const FlashcardUtils = require('../utils/Flashcard');
const uuidv1 = require('uuid/v1');

const create = async function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	let err, flashcard;

	let flashcard_info = req.body;
	//   company_info.users = [{user:user._id}];

    flashcard_info.uuid = uuidv1();
    flashcard_info.env = process.env.APP_ENV;
	console.log('req.query');
	console.log(req.query);
	if (typeof req.query.mode !== 'undefined') {
		switch (req.query.mode) {
            case 'dictionary':

				break;
            case 'separator':
                console.log('separator!!');
                flashcard_info = Object.assign(
					FlashcardUtils.separator(flashcard_info.flashcard),
					flashcard_info
				);
				delete flashcard_info.flashcard;
				break;
			default:
				console.log('Sorry, we are out of ' + expr + '.');
		}
	}
	console.log(flashcard_info);



	[err, flashcard] = await to(Flashcard.create(flashcard_info));
	console.log(flashcard);
	console.log(err);
	if (err) return ReE(res, err, 422);

	return ReS(res, {
		flashcard: flashcard
	}, 201);
}
module.exports.create = create;

const getAll = async function(req, res){
    res.setHeader('Content-Type', 'application/json');
  //  let user = req.user;
    let err, flashcards, deck;
    [err, flashcards] = await to(Flashcard.getAll());
	
	if (typeof req.query.deck === 'undefined') {
		deck = "Default";
	} else {
		deck = req.query.deck.toLowerCase();
	}
	
	let flashcards_json = [];
	for (let i in flashcards){
		let flashcard = flashcards[i];

		console.log('flashcard');
		console.log(flashcard);
		if (typeof flashcard !== 'undefined') {
			if ((flashcard.hasOwnProperty('deck') && flashcard.deck.toLowerCase() === deck)
				||
				(!flashcard.hasOwnProperty('deck') && deck == "Default")
		 ) {
				flashcards_json.push(flashcard);
			}
		}
	}
	
	if (typeof req.query.mode !== 'undefined') {
		switch (req.query.mode) {
            case 'anki':
                console.log('anki!!');
                flashcards_json = FlashcardUtils.convertToAnki(flashcards_json, deck);
				break;
			default:
				console.log('Sorry, we are out of ' + expr + '.');
		}
	}

    return res.send(flashcards_json);
}
module.exports.getAll = getAll;

// const get = function(req, res){
//     res.setHeader('Content-Type', 'application/json');
//     let flashcard = req.flashcard;
//     return ReS(res, {flashcard:flashcard.toWeb()});
// }
// module.exports.get = get;

// const update = async function(req, res){
//     let err, flashcard, data;
//     flashcard = req.user;
//     data = req.body;
//     flashcard.set(data);

//     [err, flashcard] = await to(flashcard.save());
//     if(err){
//         return ReE(res, err);
//     }
//     return ReS(res, {flashcard:flashcard.toWeb()});
// }
// module.exports.update = update;

// const remove = async function(req, res){
//     let flashcard, err;
//     flashcard = req.flashcard;

//     [err, flashcard] = await to(flashcard.remove());
//     if(err) return ReE(res, 'error occured trying to delete the flashcard');

//     return ReS(res, {message:'Deleted Flashcard'}, 204);
// }
// module.exports.remove = remove;

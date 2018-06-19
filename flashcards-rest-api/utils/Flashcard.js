'use stict';

const SEPARATOR = '---';

module.exports.separator = function (separatedString) {
	if (typeof separatedString !== 'undefined' && separatedString != null) {
		const flashcardSides = separatedString.split(SEPARATOR);

		//TODO Improve to allow more sides
		return {
			side0: flashcardSides[0],
			side1: flashcardSides.slice(1).join(SEPARATOR)
		};
	} else {
		return {
			side0: "",
			side1: "",
		}
	}
};

module.exports.convertToAnki = function (data, deck) {
	if (typeof deck === 'undefined') {
		deck = 'Default';
	}

	// Save cards to Anki
	const jsonFlashcards = {
		action: 'addNotes',
		version: 5,
		params: {
			notes: [],
		},
	};

	data.forEach((card) => {
		console.log(card);
		if (typeof card !== 'undefined') {
			const addNoteData = {
				deckName: deck,
				modelName: 'Basic',
				fields: {
					Front: card.side0,
					Back: card.side1,
				},
				tags: [
					'os_flashcards',
				],
			};

			jsonFlashcards.params.notes.push(addNoteData);
		}
	});
	return jsonFlashcards;
};
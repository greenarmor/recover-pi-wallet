#!/usr/bin/env node

const readline = require("readline-sync");
const bip39 = require("bip39");
const { derivePath } = require("@hawkingnetwork/ed25519-hd-key-rn");
const { Keypair } = require("stellar-sdk");

const BIP39_WORDLIST = bip39.wordlists.english;
const PI_NETWORK_PATH = "m/44'/314159'/0'";

// Prompt user input
const originalPublicKey = readline.question("Enter your Pi Network public key (G...): ").trim();
const partialMnemonicInput = readline.question("Enter your 24-word mnemonic (use '_' for missing words): ").trim();

// Convert input into an array
const partialMnemonic = partialMnemonicInput.split(" ").map(word => (word === "_" ? null : word));

if (partialMnemonic.length !== 24) {
	console.error("Error: You must enter exactly 24 words (use '_' for missing words).");
	process.exit(1);
}

function generateMnemonicVariants(partialMnemonic) {
	let missingIndexes = partialMnemonic.map((word, i) => (word === null ? i : -1)).filter(i => i !== -1);
	let possibleMnemonics = [];

	for (let word1 of BIP39_WORDLIST) {
		for (let word2 of BIP39_WORDLIST) {
			let mnemonic = [...partialMnemonic];
			mnemonic[missingIndexes[0]] = word1;
			mnemonic[missingIndexes[1]] = word2;
			possibleMnemonics.push(mnemonic.join(" "));
		}
	}

	return possibleMnemonics;
}

async function recoverMnemonic() {
	console.log("\nAttempting to recover your mnemonic... This may take some time.");

	let possibleMnemonics = generateMnemonicVariants(partialMnemonic);
	let totalAttempts = possibleMnemonics.length;
	let attempt = 0;

	for (let mnemonic of possibleMnemonics) {
		attempt++;
		if (bip39.validateMnemonic(mnemonic)) {
			let seed = await bip39.mnemonicToSeed(mnemonic);
			let { key } = derivePath(PI_NETWORK_PATH, seed);
			let keypair = Keypair.fromRawEd25519Seed(key);

			if (keypair.publicKey() === originalPublicKey) {
				console.log("\n✅ MATCH FOUND! Your full mnemonic:");
				console.log(`📌 ${mnemonic}\n`);
				return;
			}
		}

		if (attempt % 100000 === 0) {
			console.log(`🔄 Progress: ${attempt}/${totalAttempts} attempts checked...`);
		}
	}

	console.log("❌ No valid mnemonic found. Try refining the missing words.");
}

recoverMnemonic();


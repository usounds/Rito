// file: lex.config.js
import { defineLexiconConfig } from '@atcute/lex-cli';

export default defineLexiconConfig({
	generate: {
		files: [
			'../lexicons/blue/rito/feed/**/*.json',
			'../lexicons/blue/rito/preference/**/*.json',
			'../lexicons/blue/rito/service/**/*.json',
			'../lexicons/blue/rito/private/**/*.json',
		],
		outdir: 'src/lexicons/',
	},
});
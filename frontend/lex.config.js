// file: lex.config.js
import { defineLexiconConfig } from '@atcute/lex-cli';

export default defineLexiconConfig({
	files: ['../lexicons/**/*.json'],
	outdir: 'src/lexicons/',
});
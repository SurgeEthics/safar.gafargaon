import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'private-archives/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];

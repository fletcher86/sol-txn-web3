import * as bs58 from 'bs58';

const bytes = bs58.decode('3Bxs4aRKdRW2MG7y');
const jsonString = Buffer.from(bytes).toString('utf8');

console.log(jsonString);





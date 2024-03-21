import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/tons_of_friends_core.tact',
    options: {
        debug: true
    }
};

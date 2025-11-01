import { beginCell, Cell, Dictionary } from '@ton/core';
import { Blockchain } from '@ton/sandbox';

import { LibrarianConfig } from './types';

export function librarianConfigToCell(config: LibrarianConfig): Cell {
    return config.code;
}

export const fromCodeLibrary = (codeRaw: Cell): Cell => {
    // https://docs.ton.org/tvm.pdf, page 30
    // Library reference cell — Always has level 0, and contains 8+256 data bits, including its 8-bit type integer 2
    // and the representation hash Hash(c) of the library cell being referred to. When loaded, a library
    // reference cell may be transparently replaced by the cell it refers to, if found in the current library context.

    const libraryReferenceCell = beginCell().storeUint(2, 8).storeBuffer(codeRaw.hash()).endCell();

    return new Cell({ exotic: true, bits: libraryReferenceCell.bits, refs: libraryReferenceCell.refs });
};

export async function deploySandboxLibrary(blockchain: Blockchain, code: Cell): Promise<Cell> {
    const _libs = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    _libs.set(BigInt(`0x${code.hash().toString('hex')}`), code);
    const libs = beginCell().storeDictDirect(_libs).endCell();
    blockchain.libs = libs;

    return fromCodeLibrary(code);
}

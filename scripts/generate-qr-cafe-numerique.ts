// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import QRCode from 'qrcode';

const URL = 'https://governance.brussels/merci-cafe-numerique';
const OUTPUT = resolve(process.cwd(), 'public/qr-cafe-numerique.png');

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });

  await QRCode.toFile(OUTPUT, URL, {
    type: 'png',
    errorCorrectionLevel: 'H',
    width: 1000,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  console.log(`QR code généré : ${OUTPUT}`);
  console.log(`URL encodée     : ${URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

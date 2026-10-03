// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { getWhatsappChannel } from './whatsapp-channel';

describe('getWhatsappChannel', () => {
  it.each(['fr', 'nl', 'en'])('propose la chaîne en %s', (locale) => {
    const canal = getWhatsappChannel(locale);
    expect(canal).not.toBeNull();
    expect(canal?.url).toMatch(/^https:\/\/whatsapp\.com\/channel\/\w+$/);
    expect(canal?.accroche).toContain('WhatsApp');
    expect(canal?.bouton).toContain('WhatsApp');
  });

  it("ne propose rien en allemand : la chaîne ne publie pas dans cette langue", () => {
    expect(getWhatsappChannel('de')).toBeNull();
  });

  it('ne propose rien pour une langue inconnue', () => {
    expect(getWhatsappChannel('xx')).toBeNull();
  });
});

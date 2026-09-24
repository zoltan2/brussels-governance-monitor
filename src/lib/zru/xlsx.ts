// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
// Lecteur XLSX minimal (sans dépendance) : zip + sharedStrings + une feuille.

import { inflateRawSync } from 'node:zlib';

function entrees(buf: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('xlsx : fin de répertoire zip introuvable');
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('xlsx : répertoire central corrompu');
    const methode = buf.readUInt16LE(p + 10);
    const taille = buf.readUInt32LE(p + 20);
    const lNom = buf.readUInt16LE(p + 28), lExtra = buf.readUInt16LE(p + 30), lCom = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nom = buf.toString('utf8', p + 46, p + 46 + lNom);
    const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const brut = buf.subarray(debut, debut + taille);
    out.set(nom, methode === 8 ? inflateRawSync(brut) : brut);
    p += 46 + lNom + lExtra + lCom;
  }
  return out;
}

const decode = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function colonne(ref: string): number {
  const lettres = ref.match(/^[A-Z]+/)![0];
  let n = 0;
  for (const c of lettres) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

export function lireFeuille(buf: Buffer, feuille: number): (string | number | null)[][] {
  const z = entrees(buf);
  const ssXml = z.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const partagees = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );
  const xml = z.get(`xl/worksheets/sheet${feuille}.xml`)?.toString('utf8');
  if (!xml) throw new Error(`xlsx : feuille ${feuille} absente`);
  const lignes: (string | number | null)[][] = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const ligne: (string | number | null)[] = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, ref, attrs, corps = ''] = c;
      const t = attrs.match(/t="([^"]+)"/)?.[1];
      const v = corps.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let val: string | number | null = null;
      if (t === 's' && v !== undefined) val = partagees[Number(v)];
      else if (t === 'inlineStr') val = decode([...corps.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''));
      else if (t === 'str' && v !== undefined) val = decode(v);
      else if (v !== undefined) val = Number(v);
      const i = colonne(ref);
      while (ligne.length < i) ligne.push(null);
      ligne[i] = val;
    }
    lignes.push(ligne);
  }
  return lignes;
}

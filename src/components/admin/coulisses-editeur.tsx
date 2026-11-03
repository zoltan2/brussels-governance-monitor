// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

/**
 * Éditeur du corps des coulisses (Tiptap, licence MIT). Il ne propose que ce
 * que le mail sait afficher : paragraphes, intertitres, gras, italique,
 * liens, listes, citation. Le serveur nettoie le HTML à l'enregistrement
 * (src/lib/coulisses/corps.ts) : ce qui n'est pas dans cette liste ne passe pas.
 *
 * Un texte collé depuis une page ou un traitement de texte garde gras,
 * intertitres et liens.
 */
import { useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface Props {
  id: string;
  initial: string;
  disabled?: boolean;
  onChange: (html: string) => void;
}

function Bouton({ actif, onClick, children, titre, disabled }: {
  actif?: boolean; onClick: () => void; children: React.ReactNode; titre: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${actif ? 'bg-brand-900 text-neutral-50' : 'border border-neutral-300 text-neutral-800 hover:bg-neutral-100'}`}
    >
      {children}
    </button>
  );
}

function BarreOutils({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const etat = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      gras: e.isActive('bold'),
      italique: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      puces: e.isActive('bulletList'),
      numeros: e.isActive('orderedList'),
      citation: e.isActive('blockquote'),
      lien: e.isActive('link'),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
    }),
  });
  const [lienOuvert, setLienOuvert] = useState(false);
  const [url, setUrl] = useState('');
  const c = () => editor.chain().focus();

  function appliquerLien() {
    const u = url.trim();
    if (!u) c().extendMarkRange('link').unsetLink().run();
    else c().extendMarkRange('link').setLink({ href: u }).run();
    setLienOuvert(false);
  }

  return (
    <div className="border-b border-neutral-200 bg-neutral-50 p-2">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Mise en forme">
        <Bouton titre="Gras" actif={etat.gras} disabled={disabled} onClick={() => c().toggleBold().run()}><strong>G</strong></Bouton>
        <Bouton titre="Italique" actif={etat.italique} disabled={disabled} onClick={() => c().toggleItalic().run()}><em>I</em></Bouton>
        <Bouton titre="Intertitre" actif={etat.h2} disabled={disabled} onClick={() => c().toggleHeading({ level: 2 }).run()}>Intertitre</Bouton>
        <Bouton titre="Sous-intertitre" actif={etat.h3} disabled={disabled} onClick={() => c().toggleHeading({ level: 3 }).run()}>Sous-intertitre</Bouton>
        <Bouton titre="Liste à puces" actif={etat.puces} disabled={disabled} onClick={() => c().toggleBulletList().run()}>• Liste</Bouton>
        <Bouton titre="Liste numérotée" actif={etat.numeros} disabled={disabled} onClick={() => c().toggleOrderedList().run()}>1. Liste</Bouton>
        <Bouton titre="Citation" actif={etat.citation} disabled={disabled} onClick={() => c().toggleBlockquote().run()}>Citation</Bouton>
        <Bouton
          titre="Lien"
          actif={etat.lien}
          disabled={disabled}
          onClick={() => {
            setUrl(etat.href);
            setLienOuvert((o) => !o);
          }}
        >
          Lien
        </Bouton>
      </div>
      {lienOuvert && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-xs text-neutral-700" htmlFor="coulisses-lien">Adresse</label>
          <input
            id="coulisses-lien"
            type="url"
            value={url}
            placeholder="https://governance.brussels/fr/…"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                appliquerLien();
              }
            }}
            className="min-w-0 flex-1 rounded border border-neutral-400 px-2 py-1 text-xs"
          />
          <button type="button" onClick={appliquerLien} className="rounded bg-brand-900 px-2 py-1 text-xs text-neutral-50">
            {url.trim() ? 'Appliquer' : 'Retirer le lien'}
          </button>
        </div>
      )}
    </div>
  );
}

export function CoulissesEditeur({ id, initial, disabled, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['https', 'http', 'mailto'],
          HTMLAttributes: { rel: null, target: null },
        },
      }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        class:
          'min-h-64 px-3 py-2 font-serif text-sm text-neutral-900 focus:outline-none ' +
          '[&_p]:mb-3 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold ' +
          '[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_a]:text-brand-900 [&_a]:underline ' +
          '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 ' +
          '[&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:italic',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) {
    return <div className="min-h-64 rounded border border-neutral-400 bg-neutral-50" aria-busy="true" />;
  }
  return (
    <div className="overflow-hidden rounded border border-neutral-400">
      <BarreOutils editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { hashQuestion, type QuizData, type ReviewState } from '../quiz-provenance'

/**
 * `hashQuestion` joint les champs par un séparateur qui DOIT rester un octet
 * NUL. Ce n'est pas un détail de style : le séparateur entre dans le hash, et
 * `data/quiz-review-state.json` conserve 269 hashes calculés avec lui. Le
 * remplacer par une espace ne casse rien visiblement — `isReviewed` renvoie
 * simplement `false` partout, la totalité des relectures est perdue en silence
 * et le compteur de transparence de l'article 50 retombe à zéro.
 *
 * Mesuré le 2026-08-25 sur les données réelles : 177 entrées sur 269
 * correspondent encore avec le NUL, 0 sur 269 avec une espace.
 */
describe('hashQuestion', () => {
  const root = path.join(__dirname, '..', '..')
  const pool = JSON.parse(
    fs.readFileSync(path.join(root, 'public/quiz-data-fr.json'), 'utf-8'),
  ) as QuizData
  const state = JSON.parse(
    fs.readFileSync(path.join(root, 'data/quiz-review-state.json'), 'utf-8'),
  ) as ReviewState

  it('reproduit le hash enregistré d\'une question réellement relue', () => {
    const entries = Object.entries(state.entries).filter(([key]) =>
      key.startsWith('fr:'),
    )
    const vector = entries.find(([key, entry]) => {
      const q = pool.questions.find((x) => x.id === key.slice(3))
      return q !== undefined && entry.reviewedHash === hashQuestion(q)
    })
    expect(vector, 'aucune entrée fr ne correspond plus : le séparateur a changé').toBeDefined()
  })

  it('conserve les 45 questions fr relues du pool courant', () => {
    const matching = pool.questions.filter((q) => {
      const entry = state.entries[`fr:${q.id}`]
      return entry !== undefined && entry.reviewedHash === hashQuestion(q)
    })
    expect(matching).toHaveLength(45)
  })

  it('ne joint pas les champs par une espace : deux découpages voisins diffèrent', () => {
    const base = { id: 'x', source: 'domain', domain: 'Test', correct: 0 } as const
    const a = {
      ...base,
      question: 'a b',
      options: ['c', 'd', 'e', 'f'],
      explanation: 'g',
    }
    const b = {
      ...base,
      question: 'a',
      options: ['b c', 'd', 'e', 'f'],
      explanation: 'g',
    }
    // Avec une espace comme séparateur, les deux donnent « a b c d e f g ».
    expect(hashQuestion(a as never)).not.toBe(hashQuestion(b as never))
  })
})

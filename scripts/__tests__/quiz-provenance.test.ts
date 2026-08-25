import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { hashQuestion, type QuizData, type ReviewState } from '../quiz-provenance'

/**
 * `hashQuestion` joint les champs par un séparateur qui DOIT rester un octet
 * NUL. Ce n'est pas un détail de style : le séparateur entre dans le hash, et
 * `data/quiz-review-state.json` conserve les hashes de toutes les questions
 * relues. Le remplacer par une espace ne casse rien visiblement — `isReviewed`
 * renvoie simplement `false` partout, les relectures sont perdues en silence
 * et le compteur de transparence de l'article 50 retombe à zéro.
 *
 * Mesuré le 2026-08-25 : avec le NUL, 177 des 269 entrées d'alors
 * correspondaient ; avec une espace, aucune.
 */
describe('hashQuestion', () => {
  /**
   * Vecteur figé, indépendant du contenu du dépôt : mêmes entrées, même hash,
   * quelles que soient les régénérations du pool. C'est lui qui verrouille
   * l'algorithme ; les tests suivants ne font que le relier aux données
   * réelles.
   */
  it('reproduit un hash de référence sur une entrée figée', () => {
    const vector = {
      id: 'vector',
      source: 'domain',
      domain: 'Test',
      correct: 0,
      question: 'Combien de communes compte la Région de Bruxelles-Capitale ?',
      options: ['Dix-neuf', 'Six', 'Vingt-deux', 'Neuf'],
      explanation:
        'Les dix-neuf communes forment l’arrondissement administratif de Bruxelles-Capitale.',
    }
    expect(hashQuestion(vector as never)).toBe(
      'sha256:9d919df3a01f26d92e5ae9924daaacc1',
    )
  })

  it('ne joint pas les champs par une espace : deux découpages voisins diffèrent', () => {
    const base = { id: 'x', source: 'domain', domain: 'Test', correct: 0 } as const
    const a = { ...base, question: 'a b', options: ['c', 'd', 'e', 'f'], explanation: 'g' }
    const b = { ...base, question: 'a', options: ['b c', 'd', 'e', 'f'], explanation: 'g' }
    // Avec une espace comme séparateur, les deux donnent « a b c d e f g ».
    expect(hashQuestion(a as never)).not.toBe(hashQuestion(b as never))
  })

  /**
   * Lien avec les données réelles, formulé pour ne pas dépendre d'un compte :
   * une relecture peut légitimement retomber quand une question est
   * régénérée, mais elles ne peuvent pas TOUTES tomber d'un coup. C'est
   * exactement ce que produirait un changement de séparateur.
   */
  it('les hashes enregistrés correspondent encore au pool français', () => {
    const root = path.join(__dirname, '..', '..')
    const pool = JSON.parse(
      fs.readFileSync(path.join(root, 'public/quiz-data-fr.json'), 'utf-8'),
    ) as QuizData
    const state = JSON.parse(
      fs.readFileSync(path.join(root, 'data/quiz-review-state.json'), 'utf-8'),
    ) as ReviewState

    const stamped = pool.questions.filter((q) => state.entries[`fr:${q.id}`])
    const matching = stamped.filter(
      (q) => state.entries[`fr:${q.id}`]!.reviewedHash === hashQuestion(q),
    )
    expect(stamped.length, 'aucune question fr estampillée').toBeGreaterThan(0)
    expect(
      matching.length,
      'plus aucun hash enregistré ne correspond : le séparateur a changé',
    ).toBeGreaterThan(stamped.length / 2)
  })
})

/**
 * Filtre des URL envoyées à Umami : on garde les UTM, on jette tout le reste.
 *
 * Deux exigences contraires, tenues ensemble depuis le 22/09/2026.
 *
 * 1. **Les jetons d'abonné ne doivent jamais partir.** Les liens des emails
 *    portent `?token=…`, valable un an (`src/lib/token.ts`), qui donne lecture
 *    de l'adresse et des thèmes d'un abonné et permet de le désabonner. L'audit
 *    du 21/09 (SEC-05) a constaté qu'ils s'inscrivaient dans la base Umami.
 * 2. **Les UTM doivent partir.** Le rapport hebdomadaire attribue les visites du
 *    digest (`utm_source=bgm-digest`) et des assistants par ce seul signal.
 *
 * La première correction, l'attribut `exclude-search` du traceur, tenait l'exigence 1 en
 * sacrifiant la 2 : le traceur vidait TOUTE la chaîne de requête. De plus, elle
 * n'était posée que sur deux des quatre endroits qui chargent le traceur.
 *
 * D'où une liste blanche, appliquée par le crochet `data-before-send` du
 * traceur. Vérifié dans le traceur servi le 22/09/2026 : avant chaque envoi,
 * `const n = window[nom]; if (typeof n === "function") e = await n(type, e)`,
 * et rien ne part si la fonction renvoie une valeur fausse.
 *
 * Règles, pour `url` ET `referrer` :
 * - même origine : on ne garde que les paramètres `utm_*` ; fragment supprimé ;
 * - autre origine (référent externe) : origine et chemin seulement ;
 * - URL illisible ou erreur : l'envoi est ANNULÉ. Une visite perdue vaut mieux
 *   qu'un jeton enregistré.
 *
 * Pages internes : les envois qui portent sur `/xx/admin`, `/xx/review` ou
 * `/xx/login` sont annulés (demande du 20/09/2026, livrée le 22/09). Ces pages
 * sont sous authentification et ne servent qu'à l'équipe : les compter
 * gonflait le trafic « direct ». Le traceur n'a pas d'option d'exclusion par
 * chemin (`data-domains` filtre l'hôte) ; le crochet la fournit, y compris lors
 * des navigations internes, puisqu'il reçoit l'URL de chaque envoi. `/refonte`,
 * public, reste mesuré.
 *
 * Le référent compte autant que l'URL : lors d'une navigation interne, Umami
 * envoie l'URL précédente comme référent. Un lecteur qui quitte sa page de
 * préférences ferait donc partir le jeton par ce champ.
 *
 * Le code tourne dans le navigateur, avant le traceur, en script en ligne :
 * c'est une chaîne, pas une fonction TypeScript, parce qu'une fonction
 * transpilée puis sérialisée par `toString()` dépendrait de la chaîne de build.
 * `umami-before-send.test.ts` exécute CETTE chaîne, pas une copie.
 */

/** Nom de la fonction globale, repris par `data-before-send`. */
export const UMAMI_BEFORE_SEND = 'bgmUmamiBeforeSend';

export const UMAMI_BEFORE_SEND_SCRIPT = `(function(){
function f(u){
var x=new URL(u,location.href);
if(x.origin!==location.origin){return x.origin+x.pathname;}
var q=new URLSearchParams();
x.searchParams.forEach(function(v,k){if(/^utm_[a-z]+$/.test(k)){q.append(k,v);}});
var s=q.toString();
return x.origin+x.pathname+(s?'?'+s:'');
}
window.${UMAMI_BEFORE_SEND}=function(type,p){
try{
if(!p||typeof p!=='object'){return p;}
if(p.url&&/^\\/[a-z]{2}\\/(admin|review|login)(\\/|$)/.test(new URL(p.url,location.href).pathname)){return null;}
if(p.url){p.url=f(p.url);}
if(p.referrer){p.referrer=f(p.referrer);}
return p;
}catch(e){return null;}
};
})();`;

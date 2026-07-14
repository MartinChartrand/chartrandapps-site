// ui-strings.ts — dictionnaire des strings UI du chrome de rendu (fr/en).
// Née avec le 1er site anglophone (scotland). Les composants reçoivent `lang`
// (destination.json, défaut 'fr') et consomment ce dictionnaire — AUCUN string
// de chrome codé dur dans les composants épisode/container. Le CONTENU (fiches,
// carnet, POIs) reste dans la langue de ses données ; ici c'est le chrome seulement.
// `en` est typé sur `fr` → toute clé ajoutée d'un bord doit exister de l'autre.

const fr = {
  // Layout global
  skipLink: 'Aller au contenu',
  backToTopAria: 'Retour en haut',

  // Topbar épisode (EpisodeLayout)
  modeToggleAria: 'Mode de consultation',
  modeEpisode: 'Épisode',
  modeCarnet: 'Carnet',
  backToSurvolAria: (dest: string) => `Retour au survol — ${dest}`,

  // Page épisode ([dest]/[base])
  coldOpenMapAria: 'Cold open — la carte',
  montageMapAria: 'Le montage — le reste du chapitre',
  chapterKicker: (n: number, total: number, nights: number, dates: string) =>
    `Chapitre ${n} de ${total} · ${nights} nuits · ${dates}`,
  montageKicker: 'Le montage',
  montageTitle: 'Ce que la caméra a pas eu le temps de filmer',
  openCarnet: 'Ouvrir le carnet',

  // Carnet (CarnetSection)
  carnetKicker: (title: string, dates: string) => `Carnet — ${title} · ${dates}`,
  carnetMapAria: 'Mini-carte du carnet',
  kmlExport: (n: number) => `⤓ Exporter les ${n} lieux (KML)`,
  kmlHintLead: 'Étape ordi, une seule fois :',
  kmlHintBefore: ' télécharge le fichier sur ton ordinateur, importe-le dans ',
  kmlHintAfter:
    ' (Créer une carte → Importer). La carte apparaît ensuite dans l’app Google Maps de ton téléphone — Enregistrés → Cartes — offline inclus. Le fichier ne s’ouvre pas directement sur iPhone (Google n’a plus d’app My Maps). Sur le terrain, les pills « Maps » de chaque lieu font la job en un tap.',
  storyToggle: 'le récit',
  sourcesLabel: 'Sources :',
  backToEpisode: '← Revenir à l’épisode',

  // Container survol (ContainerSurvol + [dest]/index)
  tripBriefAria: 'Le voyage en bref',
  chaptersAria: 'Les chapitres du voyage',
  tileOpen: 'Ouvrir l’épisode →',
  tileComing: 'À venir',
  factSeason: 'Saison',
  factDuration: 'Durée du séjour',
  factDays: (n: number) => `~${n} jours`,
  factFlight: 'Vol open-jaw',
  factBudget: (count: number) =>
    count > 1 ? `Budget · ${count} pers. (CAD)` : 'Budget · solo (CAD)',

  // Crédits photo (ImageCredits)
  creditsTitle: 'Crédits photo',
};

const en: typeof fr = {
  skipLink: 'Skip to content',
  backToTopAria: 'Back to top',

  modeToggleAria: 'Viewing mode',
  modeEpisode: 'Episode',
  modeCarnet: 'Field notes',
  backToSurvolAria: (dest: string) => `Back to the overview — ${dest}`,

  coldOpenMapAria: 'Cold open — the map',
  montageMapAria: 'The montage — the rest of the chapter',
  chapterKicker: (n: number, total: number, nights: number, dates: string) =>
    `Chapter ${n} of ${total} · ${nights} nights · ${dates}`,
  montageKicker: 'The montage',
  montageTitle: 'What the camera didn’t have time to film',
  openCarnet: 'Open the field notes',

  carnetKicker: (title: string, dates: string) => `Field notes — ${title} · ${dates}`,
  carnetMapAria: 'Field-notes mini-map',
  kmlExport: (n: number) => `⤓ Export all ${n} places (KML)`,
  kmlHintLead: 'One-time desktop step:',
  kmlHintBefore: ' download the file to your computer, then import it at ',
  kmlHintAfter:
    ' (Create a new map → Import). The map then shows up in the Google Maps app on your phone — Saved → Maps — offline included. The file won’t open directly on iPhone (Google retired the My Maps app). On the ground, the “Maps” pill on each place does the job in one tap.',
  storyToggle: 'the story',
  sourcesLabel: 'Sources:',
  backToEpisode: '← Back to the episode',

  tripBriefAria: 'The trip at a glance',
  chaptersAria: 'The chapters',
  tileOpen: 'Open the episode →',
  tileComing: 'Coming soon',
  factSeason: 'Season',
  factDuration: 'Trip length',
  factDays: (n: number) => `~${n} days`,
  factFlight: 'Open-jaw flights',
  factBudget: (count: number) =>
    count > 1 ? `Budget · ${count} people (CAD)` : 'Budget · solo (CAD)',

  creditsTitle: 'Photo credits',
};

export type UiLang = 'fr' | 'en';
export type UiStrings = typeof fr;

export function ui(lang?: string | null): UiStrings {
  return lang === 'en' ? en : fr;
}

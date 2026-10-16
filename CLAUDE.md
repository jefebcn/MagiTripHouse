# Magic Trip House

App Next.js 14 (App Router) + Prisma/Postgres, deploy su Vercel. Testi dell'app e commenti nel codice in italiano.

## Flusso di lavoro

- **Fai sempre merge nella `main`**: quando una PR è pronta (controlli verdi, deploy Vercel "Ready", nessun conflitto),
  uniscila nella `main` senza chiedere conferma. Metodo: merge commit.
- Prima di ogni push esegui: `npx tsc --noEmit`, `npx next lint`, `npx next build`.

## Attenzione

- La build esegue `prisma db push --accept-data-loss`: non rimuovere o rinominare modelli/campi in
  `prisma/schema.prisma` senza un ok esplicito, perché i dati in produzione verrebbero cancellati.
- Sconti: l'unico sconto attivo è il premio KratosLabs (codici personali `KRATOS-…`, vedi `lib/partner.ts` e `lib/discount.ts`).
- Meetup sospesi: restano solo i prodotti con spedizione "In loco" (`shipFrom = 'meetup'`), mostrati nel banner rosso
  `components/home/MeetupNotice.tsx`. Tutto il resto è solo in spedizione.

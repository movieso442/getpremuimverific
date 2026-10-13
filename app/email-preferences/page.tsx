export default async function EmailPreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string; updated?: string }> }) {
  const params = await searchParams
  const valid = typeof params.token === 'string' && /^[a-f0-9]{64}$/.test(params.token)
  return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-3xl font-bold">Email preferences</h1>
    {params.updated === '1' ? <p className="mt-5 text-lg">Your request was received. Help emails for an unfinished checkout will be stopped. Essential account and payment notifications are separate.</p> : valid ? <form method="POST" action="/api/customer/email-preferences" className="mt-6 space-y-5"><p className="text-lg">Stop the occasional Premium Verific help email about unfinished top-ups?</p><input type="hidden" name="token" value={params.token} /><button className="rounded-xl bg-orange-600 px-5 py-4 font-bold text-white">Stop checkout help emails</button></form> : <p className="mt-5 text-lg">Open the preferences link in your help email, or contact customer support.</p>}
  </main>
}

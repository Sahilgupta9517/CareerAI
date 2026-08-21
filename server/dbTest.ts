console.log('Available environment variable keys:')
console.log(Object.keys(process.env).filter(key => key.includes('SUPABASE') || key.includes('DATABASE') || key.includes('API') || key.includes('KEY')))

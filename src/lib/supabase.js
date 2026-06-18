import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn(
    '[Supabase] 환경변수가 설정되지 않았습니다.\n' +
    '.env.local.example 을 복사해서 .env.local 에 키를 입력해 주세요.'
  )
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
  },
})

// tRPC를 통해 비표준 계정코드 삭제하는 테스트 스크립트

const nonStandardCodes = [
  '1000', '1100', '6000', '6100', '6200', '6300', 
  '6400', '6500', '6600', '6700', '6800', '6900'
]

console.log('비표준 계정코드 삭제를 위해 다음 단계를 수행하세요:')
console.log('')
console.log('1. 브라우저에서 http://localhost:3001 접속')
console.log('2. 관리자 계정으로 로그인')
console.log('3. 개발자 도구 콘솔에서 다음 코드 실행:')
console.log('')
console.log('```javascript')

nonStandardCodes.forEach(code => {
  console.log(`// ${code} 계정코드 삭제`)
  console.log(`fetch('/api/trpc/accountCodes.delete', {`)
  console.log(`  method: 'POST',`)
  console.log(`  headers: { 'Content-Type': 'application/json' },`)
  console.log(`  body: JSON.stringify({`)
  console.log(`    json: { code: '${code}' }`)
  console.log(`  })`)
  console.log(`}).then(r => r.json()).then(console.log)`)
  console.log('')
})

console.log('```')
console.log('')
console.log('또는 계정과목 관리 화면에서 직접 삭제 버튼을 클릭하세요.')
console.log('')
console.log('삭제할 비표준 계정코드 목록:')
nonStandardCodes.forEach(code => {
  console.log(`- ${code}`)
})
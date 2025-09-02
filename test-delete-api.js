// 새로운 deleteNonStandard API 테스트

const nonStandardCodes = [
  '1000', '1100', '6000', '6100', '6200', '6300', 
  '6400', '6500', '6600', '6700', '6800', '6900'
]

console.log('브라우저에서 http://localhost:3001에 접속하여 관리자로 로그인한 후')
console.log('개발자 도구 콘솔에서 다음 코드를 실행하세요:\n')

console.log('```javascript')
console.log('fetch("/api/trpc/accountCodes.deleteNonStandard", {')
console.log('  method: "POST",')
console.log('  headers: {')
console.log('    "Content-Type": "application/json",')
console.log('    "Cookie": document.cookie')
console.log('  },')
console.log('  body: JSON.stringify({')
console.log('    json: {')
console.log(`      codes: ${JSON.stringify(nonStandardCodes, null, 6)}`)
console.log('    }')
console.log('  })')
console.log('})')
console.log('.then(response => response.json())')
console.log('.then(result => {')
console.log('  console.log("삭제 결과:", result);')
console.log('  if (result.result?.data?.deletedCount > 0) {')
console.log('    console.log("✅ 성공적으로", result.result.data.deletedCount, "개 계정코드 삭제됨");')
console.log('    location.reload(); // 페이지 새로고침')
console.log('  }')
console.log('})')
console.log('.catch(error => console.error("❌ 삭제 실패:", error));')
console.log('```\n')

console.log('삭제할 비표준 계정코드 목록:')
nonStandardCodes.forEach((code, index) => {
  console.log(`${index + 1}. ${code}`)
})
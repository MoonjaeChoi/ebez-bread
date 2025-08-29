// Browser cache and session cleanup script
// Run this in browser console if experiencing infinite reload issues

console.log('🧹 Clearing browser cache and session storage...');

// Clear all localStorage
try {
  localStorage.clear();
  console.log('✓ localStorage cleared');
} catch (e) {
  console.log('⚠️ Could not clear localStorage:', e.message);
}

// Clear all sessionStorage
try {
  sessionStorage.clear();
  console.log('✓ sessionStorage cleared');
} catch (e) {
  console.log('⚠️ Could not clear sessionStorage:', e.message);
}

// Clear all cookies for this domain
if (typeof document !== 'undefined') {
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  console.log('✓ Cookies cleared');
}

// Clear NextAuth session cookie specifically
document.cookie = "next-auth.session-token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
document.cookie = "__Secure-next-auth.session-token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";

console.log('🔄 Please refresh the page after running this script.');
console.log('✨ Cache cleanup complete!');
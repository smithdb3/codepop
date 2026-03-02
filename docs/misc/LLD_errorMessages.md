**Login Screen**

All of the following are (M) unless otherwise specified                                         
## Input Validation Errors

 | Error | Message | When |
 |-------|---------|------|
  | **Empty Field** | "Email and password are required" | User clicks sign-in without filling fields |
  | **Invalid Email Format** | "Please enter a valid email address" | Email doesn't match pattern (user@domain.com) |

  | **Password Too Short** | "Password must be at least 8 characters" | Real-time validation as they type |
  | **Password Weak** | "Password must include uppercase, lowercase, number, and special character" | Doesn't meet CodePop requirements |

  ## Authentication Errors

  | Error | Message | Concern |
  |-------|---------|---------|
  | **User Not Found** | "Email not found. Create an account?" | Prevents account enumeration attacks |
  | **Incorrect Password** | "Invalid email or password" | Vague on purpose (don't reveal which is wrong) |
  | **(C) Too Many Attempts** | "Too many login attempts. Try again in 15 minutes" | Brute force protection |
  | **(C) Account Locked** | "Your account is temporarily locked. Reset password or contact support" | Security measure |

  ## (C) Account Status Errors

  | Error | Message | Action |
  |-------|---------|--------|
  | **Email Not Verified** | "Please verify your email first" + [Resend] button | New accounts |
  | **Account Disabled** | "Your account has been disabled. Contact support" | Admin action (user account disabled) |
  | **Account Deleted** | "This account was deleted and cannot be recovered" | Final state |

  ## (C) CodePop-Specific Errors (Distributed System)

  | Error | Message | Why |
  |-------|---------|-----|
  | **Cannot Reach Store** | "Your usual store is offline. Using nearest location..." | Store node down temporarily |
  | **User Data Lookup Failed** | "Unable to verify account. Please try again" | Cross-region lookup failed |
  | **No Stores Available** | "No CodePop locations available in your region" | Regional hub unreachable |

  ## Technical/Server Errors

  | Error | Message | Retry |
  |-------|---------|-------|
  | **Network Timeout** | "Connection timed out. Check your internet and try again" | Allow retry |
  | **Server Error** | "Something went wrong. Please try again later" | Allow retry + log |
  | **Database Error** | Same as above (don't expose internals) | Auto-retry after delay |
  | **Social Login Failed** | "Google sign-in unavailable. Try email instead" | Fallback option |

  ## Security-Related Errors

  | Error | Message | Action |
  |-------|---------|--------|
  | **Invalid Token** | "Authentication failed. Please sign in again" | Force re-login |
  | **Rate Limited** | "Too many requests. Wait X seconds before trying again" | Throttle requests |

---
---
---
---

**Cart/Payment Screens**

  Error Scenarios to Handle

  ❌ Store Becomes Unavailable After Payment
    * Detect if store goes offline
    * Offer to switch to nearby store
    * Offer full refund

  ❌ Item Goes Out of Stock
    * Check inventory before charge
    * Suggest alternatives

  ❌ Geolocation Disabled During Delivery
    * Fallback to "I'm here" button
    * Show confirmation code entry screen

  ❌ Card Declined/Expired
    * Clear error message
    * Allow retry with different card
    * Save card option should still work
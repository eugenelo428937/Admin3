# UAT Commits - 2025-12-08

## Backup Branch
- **Branch**: `uat-backup-2025-12-08` (at `dc94e1b9`)
- **Base commit before today**: `14ad4049`

---

## Commit Groups for Cherry-Pick

### Group 1: Phone Country Code Handling (5 commits)

| Commit | Description | Files |
|--------|-------------|-------|
| `d378bc83` | Implement phone number country detection | CommunicationDetailsPanel.js, CheckoutSteps.js |
| `c79ac765` | Enhance phone country detection logic | CommunicationDetailsPanel.js |
| `3a592099` | Add phone number formatting for storage | CommunicationDetailsPanel.js |
| `52c57b0d` | **Major**: Contact info with country codes | 12 files (backend + frontend + migrations) |
| `e3268e9d` | Robust email validation in UserFormWizard | UserFormWizard.js |

```bash
git cherry-pick d378bc83
git cherry-pick c79ac765
git cherry-pick 3a592099
git cherry-pick 52c57b0d
git cherry-pick e3268e9d
```

---

### Group 2: VAT Calculation (4 commits)

| Commit | Description | Files |
|--------|-------------|-------|
| `f5549cf7` | VAT calculation and display logic | vat_orchestrator.py, CartSummaryPanel.js, vatUtils.js |
| `dc030bab` | Product type determination for VAT | vat_orchestrator.py |
| `f6317a8f` | VAT rate override for specific products | setup_vat_composite_rules.py |
| `7f7d55e1` | Fallback VAT result to prevent UnboundLocalError | cart/views.py + new management command |

```bash
git cherry-pick f5549cf7
git cherry-pick dc030bab
git cherry-pick f6317a8f
git cherry-pick 7f7d55e1
```

---

### Group 3: Rules Engine / Acknowledgments (3 commits)

| Commit | Description | Files |
|--------|-------------|-------|
| `3f48f213` | Digital consent acknowledgment type + IP handling | cart/models.py, cart/views.py + migration |
| `fa0e7e27` | Debug logging for acknowledgments | rules_engine/views.py, frontend services |
| `dc94e1b9` | Session creation/persistence in acknowledgment | rules_engine/views.py |

```bash
git cherry-pick 3f48f213
git cherry-pick fa0e7e27
git cherry-pick dc94e1b9
```

---

### Group 4: UI/Layout Fixes (5 commits)

| Commit | Description | Files |
|--------|-------------|-------|
| `9a43a6e0` | Fix actual_price string in checkout | CheckoutSteps.js |
| `de951c36` | z-index fix for reCAPTCHA badge | App.css |
| `b475c7f2` | Padding values for layout | Home.js |
| `4cc9db35` | Simplify padding configuration | Home.js |
| `baf6102a` | Subject/session badge display | MarkingProductCard.js |

```bash
git cherry-pick 9a43a6e0
git cherry-pick de951c36
git cherry-pick b475c7f2
git cherry-pick 4cc9db35
git cherry-pick baf6102a
```

---

### Group 5: Cart/Config Fixes (3 commits)

| Commit | Description | Files |
|--------|-------------|-------|
| `d4c634a1` | Import reference fix for rule engine | cart/views.py |
| `20212b1a` | Switch to dummy payment gateway (UAT) | settings/uat.py |
| `624da7e2` | UAT environment detection logic | config.js, CheckoutSteps.js |

```bash
git cherry-pick d4c634a1
git cherry-pick 20212b1a
git cherry-pick 624da7e2
```

---

### Merge Commits (skip)

- `aab0edac`
- `aada24f8`
- `814803ec`

---

## Status

- [x] Group 1: Phone Country Code Handling - Applied (5 commits)
- [ ] Group 2: VAT Calculation (4 commits)
- [ ] Group 3: Rules Engine / Acknowledgments (3 commits)
- [x] Group 4: UI/Layout Fixes - Applied (5 commits)
- [ ] Group 5: Cart/Config Fixes (3 commits)

---

## Applied Commits Log

### 2025-12-08 - Initial cleanup

**Group 1 (Phone Country Code Handling):**
```
894b3227 feat(CommunicationDetailsPanel): implement phone number country detection
0b087b73 feat(CommunicationDetailsPanel): enhance phone country detection logic
da4104f1 feat(CommunicationDetailsPanel): add phone number formatting for storage
1908c754 feat: enhance contact information handling with country codes
795a28b9 feat(UserFormWizard): implement robust email validation logic
```

**Group 4 (UI/Layout Fixes):**
```
e19bdb43 fix(CheckoutSteps): ensure actual_price is a string in sanitized cart items
bdee497e fix(App.css): adjust z-index for reCAPTCHA badge to improve layering
aeb02792 fix(Home): adjust padding values for improved layout consistency
c5850c64 refactor(Home): simplify padding configuration for layout consistency
4c517178 feat(ProductCard): enhance subject and session badge display
```

# TabDo - Product Requirements Document

**Version:** 1.0  
**Date:** July 16, 2025  
**Status:** Draft  
**Owner:** Product Team  
**Stakeholders:** Engineering, Design, QA

---

## 1. Executive Summary

TabDo is a minimalist browser extension that transforms the new-tab page into an always-visible to-do list. By presenting three horizontal lists (Daily, Recurring Daily, and Weekly) every time users open a new tab, TabDo ensures task management becomes an integral part of the browsing experience.

### Key Value Propositions
- **Zero Friction:** No sign-up, cloud sync, or external dependencies
- **Privacy-First:** All data stored locally on-device
- **Instant Access:** Tasks visible with every new tab
- **Elegant Simplicity:** Clean UI with light/dark themes

**North Star Goal:** "The best to-do list is the one you already have open."

**Success Metric:** Users capture and organize tasks in under 3 seconds with no clicks beyond opening a new tab.

---

## 2. Problem Statement

### Current State
- Users rely on separate apps or physical notes for task management
- Task lists are easily forgotten when not actively visible
- Most to-do apps require context switching and active engagement
- Privacy concerns with cloud-based task management solutions

### User Pain Points
1. **Visibility Gap:** Tasks hidden in separate apps are easily forgotten
2. **Context Switching:** Moving between browser and task app disrupts workflow
3. **Over-Engineering:** Complex features for simple daily task management
4. **Privacy Concerns:** Personal tasks stored on third-party servers

### Opportunity
Create a frictionless task management experience that lives where users spend most of their time—the browser—while respecting privacy and maintaining simplicity.

---

## 3. Goals & Objectives

### Primary Goals
1. **Reduce Task Capture Time:** Enable task entry in <3 seconds
2. **Increase Task Visibility:** 100% visibility during browsing sessions
3. **Maintain Privacy:** Zero external data transmission
4. **Ensure Reliability:** Offline-first architecture with <200ms load time

### Success Metrics
- **Adoption:** 10,000 active users within 6 months
- **Retention:** 60% 30-day retention rate
- **Performance:** <200ms first meaningful paint
- **Engagement:** Average 5+ tasks created per user per day
- **Reliability:** 99.9% uptime (no crashes/data loss)

---

## 4. User Personas

### Primary Persona: Busy Professional
- **Demographics:** 25-45 years old, knowledge worker
- **Tech Savvy:** High
- **Usage Pattern:** 30+ new tabs/day
- **Key Needs:** Quick task capture, visual reminders, privacy
- **Pain Points:** Forgetting tasks, context switching

### Secondary Persona: Student Planner
- **Demographics:** 18-25 years old, university student
- **Tech Savvy:** Medium-High
- **Usage Pattern:** 15+ new tabs/day
- **Key Needs:** Assignment tracking, study schedules, deadlines
- **Pain Points:** Juggling multiple responsibilities

### Tertiary Persona: Privacy-Conscious Power User
- **Demographics:** 20-50 years old, tech professional
- **Tech Savvy:** Expert
- **Usage Pattern:** 50+ new tabs/day
- **Key Needs:** Local-only storage, open-source, customization
- **Pain Points:** Data privacy, vendor lock-in

---

## 5. User Stories & Requirements

### Epic 1: Core Task Management

#### User Stories
1. **As a user, I want to** quickly add tasks to different lists **so that** I can organize by timeframe
2. **As a user, I want to** check off completed tasks **so that** I can track progress
3. **As a user, I want to** edit existing tasks **so that** I can update details
4. **As a user, I want to** delete tasks **so that** I can remove irrelevant items
5. **As a user, I want to** reorder tasks **so that** I can prioritize

#### Functional Requirements

**FR-1: List Layout**
- Display three fixed columns: Daily, Recurring Daily, Weekly
- Responsive design: stack vertically on screens <600px
- Each list displays its title prominently

**FR-2: Add Item**
- Text input field at top of each list
- Support Enter key and "+" button for submission
- New items prepend to list (most recent first)
- Store with: UUID, text, checked status, createdAt, order

**FR-3: Edit Item**
- Show edit icon on hover
- Enable inline editing
- Save on blur or Enter key
- Preserve all other item properties

**FR-4: Complete Item**
- Checkbox to left of each item
- Click toggles completion state
- Visual feedback: green checkmark (#32C174) and strikethrough
- Completed items remain visible until reset

**FR-5: Delete Item**
- Show delete icon on hover
- Immediate deletion on click
- Smooth fade-out animation (150ms)

**FR-6: Drag & Drop**
- Drag handle visible on hover
- Reorder within same list only
- Visual feedback during drag
- Update order property on drop

### Epic 2: Automated Reset Logic

**FR-7: Reset Rules**
- **Daily List:** Delete all checked items at midnight
- **Recurring Daily:** Uncheck all items at midnight (preserve items)
- **Weekly List:** No automatic reset (future: user-configurable)
- Use local timezone for midnight calculation

### Epic 3: Settings & Customization

**FR-8: Settings Panel**
- Gear icon in bottom-right corner
- Modal overlay with:
  - Theme toggle (Light/Dark)
  - Version information
  - GitHub/changelog links
  - "Clear all data" option (with confirmation)

**FR-9: Theme Support**
- Default to system preference
- Manual override persists across sessions
- Smooth transition animation (250ms)
- WCAG AA compliant contrast ratios

---

## 6. Technical Specifications

### Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────┐
│   newtab.html       │────▶│  Manifest v3         │
│   (Entry Point)     │     │  - Firefox ≥109      │
├─────────────────────┤     │  - Chrome/Edge       │
│   JavaScript        │     └──────────────────────┘
│   - App Logic       │              │
│   - State Mgmt      │              ▼
│   - Event Handlers  │     ┌──────────────────────┐
├─────────────────────┤     │ browser.storage.local│
│   CSS/Themes        │────▶│  - Lists Data        │
│   - Light/Dark      │     │  - Theme Preference  │
│   - Animations      │     │  - Reset Timestamp   │
└─────────────────────┘     └──────────────────────┘
         │
         ▼
   ┌──────────────┐
   │  SortableJS  │
   │  (D&D Library)│
   └──────────────┘
```

### Data Schema

```json
{
  "version": 1,
  "lists": {
    "daily": [
      {
        "id": "uuid-v4",
        "text": "Task description",
        "checked": false,
        "createdAt": 1692600123456,
        "order": 0
      }
    ],
    "recurringDaily": [...],
    "weekly": [...]
  },
  "theme": "light",
  "lastReset": 1692600000000
}
```

### Technology Stack
- **Language:** TypeScript 5.x
- **Framework:** React 18+ or Lit 3.0
- **Build Tool:** Vite 5
- **Storage:** browser.storage.local API
- **Drag & Drop:** SortableJS
- **Testing:** Jest, Testing Library, Puppeteer
- **CI/CD:** GitHub Actions

---

## 7. Design Specifications

### Visual Design

#### Typography
- **Font Family:** Inter
- **Base Size:** 16px
- **Header Weight:** 500
- **Body Weight:** 400

#### Color Palette

**Light Theme:**
- Background: #F5F5F7
- Text: #1E1E1E
- Card: #FFFFFF
- Primary: #32C174 (completion)
- Danger: #FF3B30 (delete)

**Dark Theme:**
- Background: #1E1E1E
- Text: #E4E4E7
- Card: #2C2C2E
- Primary: #32C174 (completion)
- Danger: #FF3B30 (delete)

### Animations
- **Item Add:** 200ms fade-in + slide-down
- **Drag Preview:** 120ms scale(1.03)
- **Theme Switch:** 250ms cross-fade
- **Delete:** 150ms fade-out
- **Hover States:** 100ms transitions

### Responsive Breakpoints
- **Mobile:** 320px - 599px (stacked layout)
- **Tablet:** 600px - 1023px (compressed columns)
- **Desktop:** 1024px+ (full three-column layout)

---

## 8. Non-Functional Requirements

### Performance
- **First Meaningful Paint:** <200ms
- **Task Addition:** <50ms response time
- **Drag Operation:** 60fps animation
- **Storage Operations:** <10ms

### Accessibility
- **Standard:** WCAG 2.2 Level AA
- **Keyboard Navigation:** Full support
- **Screen Readers:** Proper ARIA labels
- **Focus Management:** Visible focus indicators

### Security & Privacy
- **Data Storage:** Local only (no external transmission)
- **Permissions:** Minimal (storage, new tab override)
- **Code:** Open source (MIT license)
- **Dependencies:** Security-audited packages only

### Browser Support
- **Firefox:** ≥109 (Manifest v3)
- **Chrome:** ≥88
- **Edge:** ≥88
- **Safari:** Future consideration

---

## 9. Testing Strategy

### Test Pyramid

1. **Unit Tests (60%)**
   - Pure functions
   - Reducers/state management
   - Utility functions
   - Target: 95% coverage

2. **Integration Tests (30%)**
   - Component interactions
   - Storage operations
   - Reset logic
   - Target: 90% coverage

3. **E2E Tests (10%)**
   - Critical user flows
   - Cross-browser scenarios
   - Performance benchmarks
   - 20 core test scenarios

### Key Test Scenarios
1. Add task → Complete → Reset at midnight
2. Drag and drop reordering
3. Theme switching persistence
4. Data migration between versions
5. Concurrent tab interactions

---

## 10. Release Plan

### MVP (v1.0) - 6 Weeks

**Week 1-2: Foundation**
- Core UI components
- Basic list rendering
- Theme system

**Week 3-4: Core Features**
- CRUD operations
- Storage layer
- Drag and drop

**Week 5: Polish**
- Animations
- Settings panel
- Reset logic

**Week 6: Launch Prep**
- Testing completion
- Documentation
- AMO submission

### Post-MVP Roadmap

**v1.1 (Month 2)**
- Chrome/Edge support
- Keyboard shortcuts
- Export/import data

**v1.2 (Month 3)**
- Weekly reset customization
- Task notifications
- Performance optimizations

**v2.0 (Month 6)**
- Task categories/tags
- Search functionality
- Advanced filtering

---

## 11. Success Criteria

### Launch Criteria (v1.0)
1. ✓ All functional requirements implemented
2. ✓ <200ms load time on reference hardware
3. ✓ 100% E2E test suite passing
4. ✓ Axe accessibility score ≥94
5. ✓ Zero network requests after initial load
6. ✓ Firefox Add-on store approval

### Post-Launch Metrics
- **Week 1:** 1,000 installs
- **Month 1:** 5,000 active users
- **Month 3:** 4.5+ star rating
- **Month 6:** 10,000 active users

---

## 12. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Browser API changes | High | Low | Abstract storage layer, monitor deprecations |
| Performance degradation with large lists | Medium | Medium | Implement virtualization for 50+ items |
| Data loss bugs | High | Low | Extensive testing, backup mechanism |
| Low adoption | Medium | Medium | Marketing plan, user feedback loops |

---

## 13. Open Questions

1. Should we support custom list types beyond the three defaults?
2. How should we handle extremely long task descriptions?
3. Should completed tasks have a time-based auto-delete?
4. Is there demand for basic task collaboration features?

---

## 14. Appendices

### A. Competitive Analysis
- **Momentum:** Feature-rich but heavy
- **Todoist New Tab:** Requires account
- **Papier:** Too minimal, no organization

### B. Technical Decisions
- **Why Manifest v3:** Future-proof, better security
- **Why Local Storage:** Privacy, offline-first
- **Why Three Lists:** Cognitive load balance

### C. Accessibility Checklist
- [ ] Keyboard navigation complete
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast ≥4.5:1
- [ ] Focus indicators visible
- [ ] Screen reader tested

---

**Document History:**
- v1.0 - Initial draft (2025-07-16)
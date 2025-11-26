# Context-Aware AI Bot - Quick Reference

## Import the Hook

```typescript
import { useChatContext } from '@/hooks/useChatContext';
```

---

## API Methods

### Modal Management

```typescript
const { openModal, closeModal } = useChatContext();

// Open a modal with context
openModal('modal-type', {
  title: 'Modal Title',
  entityType: 'ticket' | 'user' | 'entity' | 'service',
  entityId: 'TKT-001',
  entityName: 'Display Name',
  data: { key: 'value' }
});

// Close the modal
closeModal();
```

### Edit Mode

```typescript
const { startEditing, stopEditing } = useChatContext();

// Start editing
startEditing('entity', entityId, {
  entityName: 'Ministry of Finance',
  fields: ['name', 'abbreviation', 'type'],
  originalData: { ... }
});

// Stop editing
stopEditing();
```

### Tab Switching

```typescript
const { switchTab } = useChatContext();

// Switch tab
switchTab('tabGroup', 'activeTabId', ['tab1', 'tab2', 'tab3']);
```

### Form Progress

```typescript
const { updateFormProgress, clearForm } = useChatContext();

// Update progress
updateFormProgress('form-name', {
  completedFields: ['field1', 'field2'],
  pendingFields: ['field3'],
  currentStep: 2,
  totalSteps: 3
});

// Clear on unmount
useEffect(() => () => clearForm(), []);
```

### Low-Level API

```typescript
const { setModal, setEdit, setTab, setForm, setCustom } = useChatContext();

// Direct state setters (advanced use)
setModal({ type: 'custom-modal', ... });
setEdit({ isEditing: true, ... });
setTab({ tabGroup: 'group', activeTab: 'tab', availableTabs: [] });
setForm({ formName: 'form', ... });
setCustom({ customKey: 'customValue' });
```

---

## Common Patterns

### Modal Pattern

```typescript
function MyComponent() {
  const { openModal, closeModal } = useChatContext();
  const [showModal, setShowModal] = useState(false);

  const handleOpen = (item) => {
    setShowModal(true);
    openModal('view-item', {
      title: 'Item Details',
      entityType: 'item',
      entityId: item.id,
      entityName: item.name
    });
  };

  const handleClose = () => {
    setShowModal(false);
    closeModal();
  };

  return (
    <>
      <button onClick={() => handleOpen(item)}>View</button>
      {showModal && <Modal onClose={handleClose} />}
    </>
  );
}
```

### Tab Pattern

```typescript
function TabbedPage() {
  const { switchTab } = useChatContext();
  const [activeTab, setActiveTab] = useState('tab1');

  const tabs = ['tab1', 'tab2', 'tab3'];

  // Initialize on mount
  useEffect(() => {
    switchTab('my-tabs', activeTab, tabs);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    switchTab('my-tabs', tabId, tabs);
  };

  return (
    <div>
      {tabs.map(tab => (
        <button key={tab} onClick={() => handleTabChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}
```

### Form Pattern

```typescript
function MyForm() {
  const { updateFormProgress, clearForm } = useChatContext();
  const [formData, setFormData] = useState({ ... });

  // Track progress
  useEffect(() => {
    const completed = [];
    const pending = [];

    if (formData.field1) completed.push('field1');
    else pending.push('field1');

    if (formData.field2) completed.push('field2');
    else pending.push('field2');

    updateFormProgress('my-form', {
      completedFields: completed,
      pendingFields: pending
    });
  }, [formData, updateFormProgress]);

  // Clear on unmount
  useEffect(() => {
    return () => clearForm();
  }, [clearForm]);

  return <form>...</form>;
}
```

---

## Context Message Structure

```typescript
{
  type: 'CONTEXT_UPDATE',
  context: {
    route: '/admin/tickets',
    timestamp: 1234567890,
    changeType: 'modal' | 'edit' | 'tab' | 'form' | 'navigation' | 'custom',

    modal?: {
      type: string,
      title?: string,
      entityType?: string,
      entityId?: string | number,
      entityName?: string,
      data?: Record<string, any>
    },

    edit?: {
      isEditing: boolean,
      entityType: string,
      entityId: string | number,
      entityName?: string,
      fields?: string[],
      originalData?: Record<string, any>,
      currentData?: Record<string, any>
    },

    tab?: {
      tabGroup: string,
      activeTab: string,
      availableTabs: string[]
    },

    form?: {
      formName: string,
      currentStep?: number,
      totalSteps?: number,
      completedFields?: string[],
      pendingFields?: string[],
      validationErrors?: string[]
    },

    custom?: Record<string, any>
  }
}
```

---

## Testing Commands

### Browser Console

```javascript
// Listen for context updates
window.addEventListener('message', (e) => {
  if (e.data?.type === 'CONTEXT_UPDATE') {
    console.log('📨 Context Update:', e.data.context);
  }
});

// Check if iframe exists
const iframe = document.querySelector('iframe[title="Grenada AI Assistant"]');
console.log('Iframe found:', !!iframe);

// View context history
let history = [];
window.addEventListener('message', (e) => {
  if (e.data?.type === 'CONTEXT_UPDATE') {
    history.push({
      time: new Date().toLocaleTimeString(),
      change: e.data.context.changeType,
      route: e.data.context.route,
      modal: e.data.context.modal?.type,
      tab: e.data.context.tab?.activeTab
    });
    console.table(history);
  }
});
```

---

## Troubleshooting

### "useChatContext must be used within a ChatContextProvider"

**Solution:** Ensure your component is inside the provider (should be automatic if in app)

### postMessage not received

**Solution:**
1. Check iframe is loaded: `document.querySelector('iframe[title="Grenada AI Assistant"]')`
2. Check ChatBot is open (postMessage only sent when visible)
3. Verify CHATBOT_URL in environment variables

### Context not updating

**Solution:**
1. Check browser console for errors
2. Verify you're calling the context methods (openModal, closeModal, etc.)
3. Ensure component is calling hooks correctly

---

## File Locations

| File | Purpose |
|------|---------|
| `frontend/src/types/chat-context.ts` | TypeScript interfaces |
| `frontend/src/providers/ChatContextProvider.tsx` | React Context provider |
| `frontend/src/hooks/useChatContext.ts` | Hook export |
| `frontend/src/app/layout.tsx` | Provider setup |
| `frontend/src/components/ChatBot.tsx` | ChatBot with postMessage |

---

## Examples by Page

### Tickets Page
```typescript
openModal('view-ticket', {
  entityType: 'ticket',
  entityId: ticket.ticket_number,
  entityName: ticket.subject,
  data: { status: 'Open', priority: 'High' }
});
```

### Users Page
```typescript
openModal('edit-user', {
  entityType: 'user',
  entityId: user.id,
  entityName: user.name,
  data: { email: user.email, role: user.role_name }
});
```

### Manage Data Page
```typescript
switchTab('managedata', 'services', ['entities', 'services', 'qrcodes']);
```

### Feedback Page
```typescript
updateFormProgress('service-feedback', {
  completedFields: ['service', 'recipient_group', 'ratings'],
  pendingFields: []
});
```

---

## Best Practices

1. **Always close modals:** Call `closeModal()` in your modal's `onClose` handler
2. **Initialize tabs:** Call `switchTab()` in useEffect on mount for tabbed pages
3. **Clear forms:** Call `clearForm()` in cleanup function for forms
4. **Use helper methods:** Prefer `openModal()` over `setModal()` for better DX
5. **Type safety:** Import types from `@/types/chat-context` when needed

---

## Quick Links

- [Full Implementation Guide](./CONTEXT_AWARE_BOT_IMPLEMENTATION.md)
- [Testing Guide](./CONTEXT_AWARE_BOT_TESTING.md)
- [Type Definitions](./frontend/src/types/chat-context.ts)
- [Provider Implementation](./frontend/src/providers/ChatContextProvider.tsx)

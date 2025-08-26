# Rules Engine Architecture Specification

## Executive Summary

This document defines the comprehensive architecture for rebuilding Admin3's Rules Engine to address consistency issues and provide a robust, scalable business rule management system. The engine enables dynamic content delivery, user acknowledgments, and complex business logic execution at predefined entry points throughout the application.

## System Overview

### Core Principles
- **Declarative Rule Definition**: Rules defined as JSON configurations, not code
- **Safe Execution**: Sandboxed custom functions with strict resource limits
- **Server-Side Authority**: Critical flows always validated server-side
- **Comprehensive Auditing**: Full execution history and context snapshots
- **Performance Optimized**: Cached rules with pre-compiled expressions

### Key Benefits
- Zero-deployment rule updates through admin interface
- Consistent rule evaluation across all entry points  
- Full audit trail for compliance and debugging
- Scalable architecture supporting high-volume operations
- Secure execution environment preventing malicious code

## Architecture Components

### Component Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │───▶│   Django API     │───▶│   PostgreSQL    │
│                 │    │                  │    │                 │
│ Entry Points:   │    │ RuleEngine:      │    │ Rules (JSONB)   │
│ - checkout      │    │ - execute()      │    │ RulesFields     │
│ - home_mount    │    │ - simulate()     │    │ MessageTemplate │
│ - cart_update   │    │                  │    │ RuleExecution   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Component Stack  │
                    │                  │
                    │ RuleRepository   │
                    │ Validator        │
                    │ ConditionEval    │
                    │ ActionDispatch   │
                    │ TemplateService  │
                    │ ExecutionStore   │
                    └──────────────────┘
```

### Core Components Detail

#### RuleEngine (Main Orchestrator)
**Location**: `backend/django_Admin3/apps/rules_engine/services/rule_engine.py`

**Primary Method**: `execute(entry_point: str, context: dict) -> dict`

**Responsibilities**:
- Coordinate complete rule execution flow
- Handle exceptions and error states
- Return structured response for frontend consumption
- Maintain execution timing and metrics

**Implementation Pattern**:
```python
class RuleEngine:
    def execute(self, entry_point: str, context: dict) -> dict:
        try:
            # Fetch active rules for entry point
            rules = self.rule_repository.get_active_rules(entry_point)
            effects = []
            blocked = False
            
            for rule in rules:
                # Validate context against schema
                self.validator.validate_context(context, rule.fields_schema)
                
                # Evaluate rule conditions
                if not self.condition_evaluator.evaluate(rule.condition, context):
                    continue
                    
                # Execute actions
                for action in rule.actions:
                    effect = self.action_dispatcher.dispatch(action, context)
                    effects.append(effect)
                    
                    if action.type == "user_acknowledge" and action.required:
                        blocked = True
                
                # Log execution
                self.execution_store.log(rule, context, effects)
                
                # Handle stopProcessing flag
                if rule.stopProcessing:
                    break
                    
            return {
                "effects": effects,
                "blocked": blocked,
                "timestamp": timezone.now(),
                "entry_point": entry_point
            }
            
        except Exception as e:
            logger.error(f"Rule execution failed: {str(e)}")
            return {"error": str(e), "effects": [], "blocked": False}
```

#### RuleRepository
**Purpose**: CRUD operations and versioning for rules with performance optimization

**Key Methods**:
- `get_active_rules(entry_point: str) -> List[Rule]`
- `create_rule(rule_data: dict) -> Rule`
- `update_rule(rule_id: str, rule_data: dict) -> Rule`
- `deactivate_rule(rule_id: str) -> bool`

**Caching Strategy**:
```python
class RuleRepository:
    def get_active_rules(self, entry_point: str):
        cache_key = f"rules:{entry_point}"
        rules = cache.get(cache_key)
        
        if rules is None:
            rules = Rule.objects.filter(
                entry_point=entry_point,
                active=True
            ).order_by('priority', 'created_at')
            cache.set(cache_key, rules, timeout=300)  # 5 min cache
            
        return rules
        
    def invalidate_cache(self, entry_point: str):
        cache_key = f"rules:{entry_point}"
        cache.delete(cache_key)
```

**Database Schema**:
```sql
CREATE INDEX idx_rules_entry_active_priority 
ON rules_engine_rule (entry_point, active, priority);

CREATE INDEX idx_rules_jsonb_condition 
ON rules_engine_rule USING GIN (condition);
```

#### Validator
**Purpose**: Context validation against RulesFields JSON Schema

**Implementation**:
```python
import jsonschema

class Validator:
    def validate_context(self, context: dict, schema: dict):
        try:
            jsonschema.validate(context, schema)
        except jsonschema.ValidationError as e:
            logger.error(f"Context validation failed: {e.message}")
            raise ValidationError(f"Invalid context: {e.message}")
        except jsonschema.SchemaError as e:
            logger.error(f"Schema validation failed: {e.message}")
            # Alert administrators about schema issues
            self.alert_admin_schema_error(e)
            raise SchemaError(f"Invalid schema: {e.message}")
```

#### ConditionEvaluator
**Purpose**: Evaluate rule conditions using JSONLogic expressions

**Features**:
- Pre-compiled expression ASTs for performance
- Complex condition composition (AND/OR/NOT)
- Field existence and type checking
- Custom operator extensions

**Implementation**:
```python
from json_logic import jsonLogic

class ConditionEvaluator:
    def __init__(self):
        self._compiled_cache = {}
        
    def evaluate(self, condition: dict, context: dict) -> bool:
        condition_key = hash(json.dumps(condition, sort_keys=True))
        
        if condition_key not in self._compiled_cache:
            self._compiled_cache[condition_key] = self._compile_condition(condition)
            
        compiled_condition = self._compiled_cache[condition_key]
        return jsonLogic(compiled_condition, context)
        
    def _compile_condition(self, condition: dict):
        # Pre-process and validate condition structure
        if condition.get("type") == "jsonlogic":
            return condition["expr"]
        else:
            raise ValueError(f"Unsupported condition type: {condition.get('type')}")
```

**Condition Examples**:
```json
{
  "type": "jsonlogic",
  "expr": {
    "and": [
      { ">=": [{ "var": "cart.total" }, 50] },
      { "==": [{ "var": "user.country" }, "UK"] }
    ]
  }
}
```

#### ActionDispatcher
**Purpose**: Execute actions via pluggable ActionHandlers using Command pattern

**Handler Registration**:
```python
class ActionDispatcher:
    def __init__(self):
        self.handlers = {
            "display_message": DisplayMessageHandler(),
            "display_modal": DisplayModalHandler(),
            "user_acknowledge": UserAcknowledgeHandler(),
            "user_preference": UserPreferenceHandler(),
            "update": UpdateHandler()
        }
        
    def dispatch(self, action: dict, context: dict) -> dict:
        handler = self.handlers.get(action["type"])
        if not handler:
            raise ValueError(f"Unknown action type: {action['type']}")
            
        return handler.handle(action, context)
```

**Handler Implementations**:

```python
class DisplayMessageHandler(ActionHandler):
    def handle(self, action: dict, context: dict) -> dict:
        template = self.template_service.get(action['templateId'])
        rendered_message = self.template_service.render(template, context)
        
        return {
            "type": "display_message",
            "placement": action.get("placement", "default"),
            "priority": action.get("priority", "normal"),
            "dismissible": action.get("dismissible", True),
            "message": rendered_message
        }

class UserAcknowledgeHandler(ActionHandler):
    def handle(self, action: dict, context: dict) -> dict:
        template = self.template_service.get(action['templateId'])
        rendered_message = self.template_service.render(template, context)
        
        # Check if acknowledgment already exists
        existing_ack = self._check_existing_acknowledgment(
            action["ackKey"], 
            context.get("user", {}).get("id"),
            action.get("scope", "user")
        )
        
        return {
            "type": "user_acknowledge",
            "ackKey": action["ackKey"],
            "required": action.get("required", True),
            "message": rendered_message,
            "already_acknowledged": existing_ack is not None,
            "scope": action.get("scope", "user")
        }
```

#### MessageTemplateService
**Purpose**: Render templates with context data and handle multiple formats

**Features**:
- Multiple format support (HTML, JSON, Markdown)
- Placeholder substitution with context data
- XSS sanitization
- i18n support

**Implementation**:
```python
from jinja2 import Environment, DictLoader
import bleach

class MessageTemplateService:
    def __init__(self):
        self.jinja_env = Environment(
            loader=DictLoader({}),
            autoescape=True
        )
        
    def render(self, template: MessageTemplate, context: dict) -> str:
        if template.format == "html":
            return self._render_html(template, context)
        elif template.format == "json":
            return self._render_json(template, context)
        elif template.format == "markdown":
            return self._render_markdown(template, context)
        else:
            raise ValueError(f"Unsupported template format: {template.format}")
            
    def _render_html(self, template: MessageTemplate, context: dict) -> str:
        jinja_template = self.jinja_env.from_string(template.content)
        rendered = jinja_template.render(**context)
        
        if template.sanitize:
            allowed_tags = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
            rendered = bleach.clean(rendered, tags=allowed_tags)
            
        return rendered
```

#### ExecutionStore
**Purpose**: Persist rule execution records for audit trail and debugging

**Schema**:
```python
class RuleExecution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    rule_id = models.CharField(max_length=255)
    entry_point = models.CharField(max_length=100)
    context_snapshot = models.JSONField()  # Sanitized context data
    actions_result = models.JSONField()
    outcome = models.CharField(max_length=50)  # success, blocked, error
    execution_time_ms = models.IntegerField()
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['rule_id', 'created_at']),
            models.Index(fields=['entry_point', 'created_at']),
            models.Index(fields=['outcome', 'created_at']),
        ]
```

## Data Models

### Rule (JSONB Storage)
**Primary Model**: Stores business rules with versioning and metadata

```json
{
  "id": "rule_checkout_terms_v3",
  "name": "EU Checkout Terms Acknowledgment",
  "description": "Require terms acceptance for EU users during checkout",
  "entryPoint": "checkout_terms",
  "priority": 10,
  "active": true,
  "version": 3,
  "rulesFieldsId": "rf_checkout_context",
  "condition": {
    "type": "jsonlogic",
    "expr": { 
      "and": [
        { "in": [{ "var": "user.region" }, ["EU", "UK"]] },
        { ">=": [{ "var": "cart.total" }, 0] }
      ]
    }
  },
  "actions": [
    {
      "type": "user_acknowledge",
      "id": "ack_terms_v3",
      "messageTemplateId": "tmpl_terms_v3",
      "ackKey": "terms_v3_eu",
      "required": true,
      "persistTo": "user",
      "scope": "per-order"
    }
  ],
  "stopProcessing": true,
  "testCases": [
    {
      "name": "EU user with cart",
      "context": {
        "user": { "id": "u1", "region": "EU" },
        "cart": { "total": 49.99 }
      },
      "expectedResult": "action_required"
    }
  ],
  "metadata": {
    "createdBy": "admin_user_123",
    "createdAt": "2025-08-01T12:00:00Z",
    "lastModified": "2025-08-15T09:30:00Z",
    "changeLog": [
      {
        "version": 3,
        "changes": "Added UK region support",
        "author": "admin_user_123",
        "timestamp": "2025-08-15T09:30:00Z"
      }
    ]
  }
}
```

### RulesFields (Context Schema)
**Purpose**: Define and validate context structure for rule evaluation

```json
{
  "id": "rf_checkout_context",
  "name": "Checkout Context Schema",
  "description": "Schema for checkout flow context validation",
  "version": 2,
  "schema": {
    "type": "object",
    "properties": {
      "user": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "region": { "type": "string", "enum": ["US", "EU", "UK", "CA", "AU"] },
          "age": { "type": "integer", "minimum": 0 },
          "membershipLevel": { "type": "string", "enum": ["basic", "premium", "enterprise"] }
        },
        "required": ["id", "email", "region"]
      },
      "cart": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "quantity": { "type": "integer", "minimum": 1 },
                "price": { "type": "number", "minimum": 0 }
              },
              "required": ["id", "quantity", "price"]
            }
          },
          "total": { "type": "number", "minimum": 0 },
          "currency": { "type": "string", "enum": ["USD", "EUR", "GBP", "CAD", "AUD"] },
          "discountApplied": { "type": "boolean" }
        },
        "required": ["items", "total", "currency"]
      },
      "session": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "startTime": { "type": "string", "format": "date-time" },
          "device": { "type": "string", "enum": ["desktop", "tablet", "mobile"] }
        },
        "required": ["id"]
      }
    },
    "required": ["user", "cart"]
  },
  "createdAt": "2025-08-01T12:00:00Z",
  "lastModified": "2025-08-10T14:30:00Z"
}
```

### MessageTemplate (Multi-Format Content)
**Purpose**: Reusable message templates supporting multiple content formats

```json
{
  "id": "tmpl_terms_v3",
  "name": "Terms & Conditions v3",
  "description": "Updated terms acceptance message for EU compliance",
  "language": "en",
  "format": "json",
  "content": {
    "message_container": {
      "element": "container",
      "text_align": "left",
      "class": "terms-conditions-content"
    },
    "content": [
      {
        "seq": 1,
        "element": "h4",
        "text": "Terms & Conditions Agreement"
      },
      {
        "seq": 2,
        "element": "p",
        "text": "By completing this purchase of **{{cart.items.length}} items** totaling **{{cart.total}} {{cart.currency}}**, you agree to our updated Terms & Conditions."
      },
      {
        "seq": 3,
        "element": "ul",
        "text": [
          "Digital product delivery within 24 hours",
          "30-day refund policy for eligible items",
          "Data processing in accordance with GDPR"
        ]
      }
    ]
  },
  "placeholders": ["cart.items.length", "cart.total", "cart.currency"],
  "sanitize": true,
  "fallbackTemplateId": "tmpl_terms_v2",
  "metadata": {
    "createdBy": "content_admin_456",
    "createdAt": "2025-08-01T10:00:00Z",
    "approvedBy": "legal_team_789",
    "approvedAt": "2025-08-01T16:00:00Z"
  }
}
```

### RuleExecution (Audit Trail)
**Purpose**: Complete audit trail of rule executions with context snapshots

```json
{
  "id": "exec_20250824_12345",
  "ruleId": "rule_checkout_terms_v3",
  "entryPoint": "checkout_terms",
  "contextSnapshot": {
    "user": { 
      "id": "u123", 
      "region": "EU",
      "email": "user@example.com"  // PII may be redacted based on policy
    },
    "cart": { 
      "items": [{"id": "prod_1", "quantity": 2, "price": 24.99}],
      "total": 49.98,
      "currency": "EUR"
    },
    "session": {
      "id": "sess_abc123",
      "device": "desktop"
    }
  },
  "actionsResult": [
    {
      "actionId": "ack_terms_v3",
      "actionType": "user_acknowledge",
      "status": "pending",
      "messageRendered": "<div class='terms-conditions-content'>...</div>",
      "requiresUserInput": true
    }
  ],
  "outcome": "action_required",
  "executionTimeMs": 45,
  "errorMessage": null,
  "performanceMetrics": {
    "rulesFetched": 3,
    "conditionsEvaluated": 2,
    "actionsExecuted": 1,
    "templateRenderTime": 12
  },
  "createdAt": "2025-08-24T14:30:45.123Z",
  "metadata": {
    "serverVersion": "3.2.1",
    "ruleEngineVersion": "2.0.0",
    "requestId": "req_789xyz"
  }
}
```

## Action Types Specification

### display_message
**Purpose**: Non-blocking informational messages for user notification

**Payload Structure**:
```json
{
  "type": "display_message",
  "id": "msg_welcome",
  "messageTemplateId": "tmpl_welcome_banner",
  "placement": "top_banner",
  "priority": "normal",
  "dismissible": true,
  "autoHideDuration": 5000,
  "variant": "info",
  "metadata": {
    "trackingId": "msg_track_123"
  }
}
```

**Frontend Integration**:
```javascript
// React component handling
{effects.filter(e => e.type === 'display_message').map(effect => (
  <Alert 
    key={effect.id}
    severity={effect.variant || 'info'}
    onClose={effect.dismissible ? () => handleDismiss(effect.id) : undefined}
  >
    <div dangerouslySetInnerHTML={{ __html: effect.message }} />
  </Alert>
))}
```

### display_modal
**Purpose**: Modal dialogs requiring user interaction or acknowledgment

**Payload Structure**:
```json
{
  "type": "display_modal",
  "id": "modal_maintenance",
  "messageTemplateId": "tmpl_maintenance_notice",
  "size": "medium",
  "blocking": false,
  "backdrop": "static",
  "showCloseButton": true,
  "actions": [
    {
      "label": "Understood",
      "variant": "primary",
      "action": "close"
    },
    {
      "label": "Learn More",
      "variant": "secondary", 
      "action": "external_link",
      "url": "https://help.example.com/maintenance"
    }
  ]
}
```

### user_acknowledge
**Purpose**: User acknowledgment tracking with persistence and validation

**Payload Structure**:
```json
{
  "type": "user_acknowledge",
  "id": "ack_privacy_policy",
  "messageTemplateId": "tmpl_privacy_v4",
  "ackKey": "privacy_policy_v4",
  "required": true,
  "persistTo": "user",
  "scope": "per-user",
  "validityPeriod": "1 year",
  "acknowledgeText": "I agree to the Privacy Policy",
  "metadata": {
    "legalVersion": "4.2",
    "requiresTimestamp": true,
    "ipAddressLogging": true
  }
}
```

**Persistence Options**:
- `persistTo`: "user" | "session" | "order"
- `scope`: "per-session" | "per-user" | "per-order" | "per-product"

**Django Model**:
```python
class UserAcknowledgment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ack_key = models.CharField(max_length=100)
    rule_id = models.CharField(max_length=255)
    acknowledged_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    order_id = models.CharField(max_length=100, null=True)
    expires_at = models.DateTimeField(null=True)
    
    class Meta:
        unique_together = [['user', 'ack_key', 'scope']]
```

### user_preference
**Purpose**: Optional user preference collection and storage

**Payload Structure**:
```json
{
  "type": "user_preference",
  "id": "pref_newsletter",
  "messageTemplateId": "tmpl_newsletter_signup",
  "preferenceKey": "newsletter_subscription",
  "required": false,
  "defaultValue": false,
  "options": [
    { "value": true, "label": "Yes, send me updates" },
    { "value": false, "label": "No, thanks" }
  ],
  "category": "marketing",
  "persistTo": "user_profile"
}
```

### update
**Purpose**: Safe field updates with explicit allow-lists and transaction support

**Payload Structure**:
```json
{
  "type": "update",
  "id": "update_cart_discount",
  "target": "cart.discount_applied",
  "operation": "set",
  "value": true,
  "allowedFields": [
    "cart.discount_applied",
    "cart.promotional_code",
    "user.last_seen"
  ],
  "transactionRequired": true,
  "rollbackOnError": true,
  "functionId": "apply_member_discount",
  "metadata": {
    "auditReason": "Membership discount application"
  }
}
```

**Safety Mechanisms**:
```python
class UpdateHandler(ActionHandler):
    ALLOWED_FIELDS = {
        "cart.discount_applied": {"type": "boolean"},
        "cart.promotional_code": {"type": "string", "max_length": 50},
        "user.last_seen": {"type": "datetime"},
        "user.preferences.*": {"type": "any"}  # Wildcard with restrictions
    }
    
    def handle(self, action: dict, context: dict) -> dict:
        target = action["target"]
        
        # Validate field is in allow-list
        if not self._is_field_allowed(target):
            raise SecurityError(f"Field '{target}' not in allow-list")
            
        # Execute in transaction if required
        if action.get("transactionRequired", False):
            with transaction.atomic():
                return self._execute_update(action, context)
        else:
            return self._execute_update(action, context)
```

## Security & Sandboxing

### Custom Function Execution
**Purpose**: Safe execution of complex business logic through sandboxed functions

**Architecture**:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Rule Engine   │───▶│ Function        │───▶│   WASM/JS       │
│                 │    │ Registry        │    │   Sandbox       │
│                 │    │                 │    │                 │
│ functionId:     │    │ - Version Mgmt  │    │ - CPU Limits    │
│ "calc_discount" │    │ - Access Control│    │ - Memory Limits │
│                 │    │ - Code Review   │    │ - Time Limits   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Function Registry Implementation**:
```python
import subprocess
import json
import tempfile

class FunctionRegistry:
    def __init__(self):
        self.functions = {}
        self.sandbox_timeout = 5  # seconds
        self.memory_limit = "128MB"
        
    def register_function(self, function_id: str, code: str, language: str = "javascript"):
        """Register a new function after security review"""
        if not self._security_review_passed(code):
            raise SecurityError("Function failed security review")
            
        self.functions[function_id] = {
            "code": code,
            "language": language,
            "version": self._get_next_version(function_id),
            "created_at": timezone.now(),
            "reviewed_by": self._get_current_user()
        }
        
    def execute_function(self, function_id: str, context: dict) -> dict:
        """Execute function in sandboxed environment"""
        if function_id not in self.functions:
            raise ValueError(f"Function '{function_id}' not found")
            
        function = self.functions[function_id]
        
        if function["language"] == "javascript":
            return self._execute_javascript(function["code"], context)
        else:
            raise ValueError(f"Unsupported language: {function['language']}")
            
    def _execute_javascript(self, code: str, context: dict) -> dict:
        """Execute JavaScript in Node.js sandbox"""
        sandbox_script = f"""
        const vm = require('vm');
        const context = {json.dumps(context)};
        
        // Create sandbox with limited globals
        const sandbox = {{
            context: context,
            result: null,
            console: {{
                log: () => {{}},  // Disable console output
                error: () => {{}}
            }}
        }};
        
        try {{
            vm.runInNewContext(`
                {code}
            `, sandbox, {{
                timeout: 1000,  // 1 second timeout
                displayErrors: false
            }});
            
            console.log(JSON.stringify(sandbox.result || {{}}));
        }} catch (error) {{
            console.error(JSON.stringify({{error: error.message}}));
        }}
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js') as f:
            f.write(sandbox_script)
            f.flush()
            
            try:
                result = subprocess.run(
                    ['node', f.name],
                    capture_output=True,
                    text=True,
                    timeout=self.sandbox_timeout
                )
                
                if result.returncode == 0:
                    return json.loads(result.stdout)
                else:
                    raise RuntimeError(f"Function execution failed: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                raise RuntimeError("Function execution timeout")
```

**Example Custom Function**:
```javascript
// Function ID: "calculate_member_discount"
// Purpose: Calculate discount based on membership level and cart total

const user = context.user;
const cart = context.cart;

let discountPercent = 0;

if (user.membershipLevel === "premium") {
    if (cart.total >= 100) {
        discountPercent = 15;
    } else if (cart.total >= 50) {
        discountPercent = 10;
    } else {
        discountPercent = 5;
    }
} else if (user.membershipLevel === "basic") {
    if (cart.total >= 100) {
        discountPercent = 10;
    } else if (cart.total >= 50) {
        discountPercent = 5;
    }
}

result = {
    discountPercent: discountPercent,
    discountAmount: (cart.total * discountPercent) / 100,
    newTotal: cart.total * (1 - discountPercent / 100)
};
```

### Template Security
**XSS Prevention and Content Sanitization**

**HTML Sanitization**:
```python
import bleach
from bleach.css_sanitizer import CSSSanitizer

class SecureTemplateRenderer:
    def __init__(self):
        self.allowed_tags = [
            'p', 'strong', 'em', 'ul', 'ol', 'li', 
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'br', 'span', 'div', 'a'
        ]
        
        self.allowed_attributes = {
            'a': ['href', 'title'],
            'div': ['class'],
            'span': ['class'],
            '*': ['class', 'id']
        }
        
        self.css_sanitizer = CSSSanitizer(
            allowed_css_properties=[
                'color', 'background-color', 'font-size', 'font-weight',
                'margin', 'padding', 'text-align'
            ]
        )
        
    def render_secure_html(self, template_content: str, context: dict) -> str:
        # Render template with Jinja2
        template = Environment().from_string(template_content)
        rendered = template.render(**context)
        
        # Sanitize HTML
        cleaned = bleach.clean(
            rendered,
            tags=self.allowed_tags,
            attributes=self.allowed_attributes,
            css_sanitizer=self.css_sanitizer
        )
        
        return cleaned
```

**Rate Limiting**:
```python
from django_ratelimit.decorators import ratelimit

class TemplateService:
    @ratelimit(key='ip', rate='100/h', method='POST')
    def render_template(self, template_id: str, context: dict):
        """Rate-limited template rendering to prevent DoS"""
        pass
```

## Performance & Scaling

### Caching Strategy
**Multi-Level Caching for Optimal Performance**

```python
class CachedRuleRepository:
    def __init__(self):
        self.memory_cache = {}  # Application-level cache
        self.redis_cache = redis.Redis()  # Distributed cache
        
    def get_active_rules(self, entry_point: str) -> List[Rule]:
        # Level 1: Memory cache (fastest)
        memory_key = f"rules_mem:{entry_point}"
        if memory_key in self.memory_cache:
            return self.memory_cache[memory_key]
            
        # Level 2: Redis cache (fast)
        redis_key = f"rules:{entry_point}"
        cached_rules = self.redis_cache.get(redis_key)
        if cached_rules:
            rules = json.loads(cached_rules)
            self.memory_cache[memory_key] = rules
            return rules
            
        # Level 3: Database (slower)
        rules = self._fetch_from_database(entry_point)
        
        # Cache at all levels
        self.redis_cache.setex(redis_key, 300, json.dumps(rules))  # 5 min
        self.memory_cache[memory_key] = rules
        
        return rules
        
    def invalidate_cache(self, entry_point: str):
        """Invalidate cache at all levels"""
        memory_key = f"rules_mem:{entry_point}"
        redis_key = f"rules:{entry_point}"
        
        if memory_key in self.memory_cache:
            del self.memory_cache[memory_key]
            
        self.redis_cache.delete(redis_key)
```

### Database Optimization
**Indexing and Query Optimization**

```sql
-- Primary indexes for rule lookup
CREATE INDEX idx_rules_entry_active_priority 
ON rules_engine_rule (entry_point, active, priority);

-- JSONB indexes for condition queries
CREATE INDEX idx_rules_condition_gin 
ON rules_engine_rule USING GIN (condition);

-- Execution history indexes
CREATE INDEX idx_executions_rule_time 
ON rules_engine_execution (rule_id, created_at DESC);

CREATE INDEX idx_executions_entry_time 
ON rules_engine_execution (entry_point, created_at DESC);

-- Acknowledgment lookup optimization
CREATE INDEX idx_acknowledgments_user_key 
ON rules_engine_acknowledgment (user_id, ack_key);
```

**Query Optimization**:
```python
class OptimizedRuleRepository:
    def get_active_rules(self, entry_point: str):
        """Optimized query with select_related for performance"""
        return Rule.objects.filter(
            entry_point=entry_point,
            active=True
        ).select_related(
            'rules_fields',
            'created_by'
        ).prefetch_related(
            'actions',
            'message_templates'
        ).order_by('priority', 'created_at')
```

### High-Volume Entry Point Optimization
**Lightweight Evaluation for Frequently Accessed Points**

```python
class LightweightRuleEngine:
    def __init__(self):
        self.heavy_entry_points = {'checkout_terms', 'payment_process'}
        self.light_entry_points = {'home_page_mount', 'product_view'}
        
    def execute(self, entry_point: str, context: dict):
        if entry_point in self.light_entry_points:
            return self._execute_lightweight(entry_point, context)
        else:
            return self._execute_full(entry_point, context)
            
    def _execute_lightweight(self, entry_point: str, context: dict):
        """Fast path for non-critical entry points"""
        # Simplified validation
        # Pre-compiled condition cache
        # Minimal logging
        pass
        
    def _execute_full(self, entry_point: str, context: dict):
        """Complete processing for critical entry points"""
        # Full validation
        # Complete audit trail
        # All security checks
        pass
```

## Observability & Monitoring

### Metrics Collection
**Comprehensive Performance and Business Metrics**

```python
from prometheus_client import Counter, Histogram, Gauge
import time

class RuleEngineMetrics:
    def __init__(self):
        # Counters
        self.rules_executed = Counter(
            'rules_engine_executions_total',
            'Total number of rule executions',
            ['entry_point', 'outcome']
        )
        
        self.actions_executed = Counter(
            'rules_engine_actions_total', 
            'Total number of actions executed',
            ['action_type', 'status']
        )
        
        # Histograms
        self.execution_duration = Histogram(
            'rules_engine_execution_seconds',
            'Rule execution duration',
            ['entry_point']
        )
        
        self.condition_evaluation_duration = Histogram(
            'rules_engine_condition_evaluation_seconds',
            'Condition evaluation duration'
        )
        
        # Gauges
        self.active_rules = Gauge(
            'rules_engine_active_rules',
            'Number of active rules',
            ['entry_point']
        )
        
        self.cache_hit_rate = Gauge(
            'rules_engine_cache_hit_rate',
            'Cache hit rate percentage'
        )
        
    def record_execution(self, entry_point: str, outcome: str, duration: float):
        self.rules_executed.labels(
            entry_point=entry_point, 
            outcome=outcome
        ).inc()
        
        self.execution_duration.labels(
            entry_point=entry_point
        ).observe(duration)
        
    def record_action(self, action_type: str, status: str):
        self.actions_executed.labels(
            action_type=action_type,
            status=status
        ).inc()

# Usage in RuleEngine
class RuleEngine:
    def __init__(self):
        self.metrics = RuleEngineMetrics()
        
    def execute(self, entry_point: str, context: dict):
        start_time = time.time()
        
        try:
            # ... rule execution logic ...
            outcome = "success"
        except Exception as e:
            outcome = "error"
            raise
        finally:
            duration = time.time() - start_time
            self.metrics.record_execution(entry_point, outcome, duration)
```

### Logging Strategy
**Structured Logging with Context and Performance Data**

```python
import structlog
import json

logger = structlog.get_logger()

class RuleEngineLogger:
    def __init__(self):
        self.logger = logger
        
    def log_execution_start(self, entry_point: str, context: dict, rules_count: int):
        """Log start of rule execution"""
        self.logger.info(
            "rule_execution_started",
            entry_point=entry_point,
            context_keys=list(context.keys()),
            rules_to_evaluate=rules_count,
            timestamp=time.time()
        )
        
    def log_rule_evaluation(self, rule_id: str, condition_result: bool, 
                          execution_time_ms: float):
        """Log individual rule evaluation"""
        self.logger.debug(
            "rule_evaluated",
            rule_id=rule_id,
            condition_result=condition_result,
            execution_time_ms=execution_time_ms
        )
        
    def log_action_execution(self, action_type: str, action_id: str, 
                           result: dict, execution_time_ms: float):
        """Log action execution"""
        self.logger.info(
            "action_executed",
            action_type=action_type,
            action_id=action_id,
            result_status=result.get("status", "unknown"),
            execution_time_ms=execution_time_ms
        )
        
    def log_execution_complete(self, entry_point: str, total_time_ms: float,
                             effects_count: int, blocked: bool):
        """Log completion of rule execution"""
        self.logger.info(
            "rule_execution_completed",
            entry_point=entry_point,
            total_execution_time_ms=total_time_ms,
            effects_generated=effects_count,
            user_blocked=blocked
        )
        
    def log_error(self, error: Exception, entry_point: str, context: dict):
        """Log execution errors with context"""
        self.logger.error(
            "rule_execution_error",
            error_type=type(error).__name__,
            error_message=str(error),
            entry_point=entry_point,
            context_snapshot=self._sanitize_context(context)
        )
        
    def _sanitize_context(self, context: dict) -> dict:
        """Remove PII from context for logging"""
        sanitized = context.copy()
        
        # Remove sensitive fields
        sensitive_fields = ["email", "phone", "address", "payment_info"]
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = "[REDACTED]"
                
        return sanitized
```

### Alerting Configuration
**Proactive Monitoring and Alert System**

```python
class RuleEngineAlerts:
    def __init__(self):
        self.alert_thresholds = {
            "execution_error_rate": 0.05,  # 5% error rate
            "execution_time_p95": 1000,    # 1 second 95th percentile
            "cache_miss_rate": 0.30,       # 30% cache miss rate
            "action_failure_rate": 0.02    # 2% action failure rate
        }
        
    def check_error_rate(self, entry_point: str, error_count: int, total_count: int):
        """Alert on high error rates"""
        if total_count > 0:
            error_rate = error_count / total_count
            if error_rate > self.alert_thresholds["execution_error_rate"]:
                self._send_alert(
                    "high_error_rate",
                    f"Entry point {entry_point} has error rate {error_rate:.2%}",
                    severity="warning"
                )
                
    def check_performance(self, entry_point: str, p95_time_ms: float):
        """Alert on performance degradation"""
        if p95_time_ms > self.alert_thresholds["execution_time_p95"]:
            self._send_alert(
                "performance_degradation",
                f"Entry point {entry_point} P95 execution time: {p95_time_ms}ms",
                severity="warning"
            )
            
    def _send_alert(self, alert_type: str, message: str, severity: str):
        """Send alert through configured channels"""
        alert_data = {
            "type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": timezone.now().isoformat(),
            "service": "rules_engine"
        }
        
        # Send to monitoring systems (PagerDuty, Slack, etc.)
        # Implementation depends on infrastructure
        pass
```

## Testing Strategy

### Unit Testing
**Comprehensive Test Coverage for All Components**

```python
import pytest
from unittest.mock import Mock, patch
from rules_engine.services import RuleEngine
from rules_engine.models import Rule, RulesFields

class TestRuleEngine:
    def setup_method(self):
        self.rule_engine = RuleEngine()
        self.mock_repository = Mock()
        self.mock_validator = Mock()
        self.mock_evaluator = Mock()
        self.mock_dispatcher = Mock()
        
        # Inject mocks
        self.rule_engine.rule_repository = self.mock_repository
        self.rule_engine.validator = self.mock_validator
        self.rule_engine.condition_evaluator = self.mock_evaluator
        self.rule_engine.action_dispatcher = self.mock_dispatcher
        
    def test_execute_successful_rule_evaluation(self):
        """Test successful rule execution flow"""
        # Arrange
        entry_point = "checkout_terms"
        context = {"user": {"region": "EU"}, "cart": {"total": 50}}
        
        mock_rule = Mock()
        mock_rule.condition = {"type": "jsonlogic", "expr": {"==": [{"var": "user.region"}, "EU"]}}
        mock_rule.actions = [{"type": "user_acknowledge", "required": True}]
        mock_rule.stopProcessing = False
        
        self.mock_repository.get_active_rules.return_value = [mock_rule]
        self.mock_validator.validate_context.return_value = True
        self.mock_evaluator.evaluate.return_value = True
        self.mock_dispatcher.dispatch.return_value = {
            "type": "user_acknowledge",
            "ackKey": "terms_v2"
        }
        
        # Act
        result = self.rule_engine.execute(entry_point, context)
        
        # Assert
        assert result["blocked"] is True
        assert len(result["effects"]) == 1
        assert result["effects"][0]["type"] == "user_acknowledge"
        
        self.mock_repository.get_active_rules.assert_called_once_with(entry_point)
        self.mock_validator.validate_context.assert_called_once()
        self.mock_evaluator.evaluate.assert_called_once()
        self.mock_dispatcher.dispatch.assert_called_once()
        
    def test_execute_no_matching_conditions(self):
        """Test execution when no rule conditions match"""
        # Arrange
        entry_point = "checkout_terms"
        context = {"user": {"region": "US"}, "cart": {"total": 50}}
        
        mock_rule = Mock()
        mock_rule.condition = {"type": "jsonlogic", "expr": {"==": [{"var": "user.region"}, "EU"]}}
        
        self.mock_repository.get_active_rules.return_value = [mock_rule]
        self.mock_validator.validate_context.return_value = True
        self.mock_evaluator.evaluate.return_value = False  # Condition doesn't match
        
        # Act
        result = self.rule_engine.execute(entry_point, context)
        
        # Assert
        assert result["blocked"] is False
        assert len(result["effects"]) == 0
        
    def test_execute_validation_error(self):
        """Test handling of context validation errors"""
        # Arrange
        entry_point = "checkout_terms"
        context = {"invalid": "context"}
        
        mock_rule = Mock()
        self.mock_repository.get_active_rules.return_value = [mock_rule]
        self.mock_validator.validate_context.side_effect = ValidationError("Invalid context")
        
        # Act & Assert
        with pytest.raises(ValidationError):
            self.rule_engine.execute(entry_point, context)
            
    @patch('rules_engine.services.rule_engine.logger')
    def test_execute_error_logging(self, mock_logger):
        """Test error logging during execution"""
        # Arrange
        entry_point = "checkout_terms"
        context = {"user": {"region": "EU"}}
        
        self.mock_repository.get_active_rules.side_effect = Exception("Database error")
        
        # Act
        result = self.rule_engine.execute(entry_point, context)
        
        # Assert
        assert "error" in result
        mock_logger.error.assert_called_once()

class TestConditionEvaluator:
    def setup_method(self):
        self.evaluator = ConditionEvaluator()
        
    def test_simple_equality_condition(self):
        """Test simple equality condition evaluation"""
        condition = {
            "type": "jsonlogic",
            "expr": {"==": [{"var": "user.region"}, "EU"]}
        }
        context = {"user": {"region": "EU"}}
        
        result = self.evaluator.evaluate(condition, context)
        assert result is True
        
    def test_complex_and_condition(self):
        """Test complex AND condition with multiple clauses"""
        condition = {
            "type": "jsonlogic",
            "expr": {
                "and": [
                    {">=": [{"var": "cart.total"}, 50]},
                    {"==": [{"var": "user.region"}, "EU"]},
                    {"in": [{"var": "user.membershipLevel"}, ["premium", "enterprise"]]}
                ]
            }
        }
        context = {
            "user": {"region": "EU", "membershipLevel": "premium"},
            "cart": {"total": 75}
        }
        
        result = self.evaluator.evaluate(condition, context)
        assert result is True
        
    def test_condition_caching(self):
        """Test that conditions are properly cached for performance"""
        condition = {
            "type": "jsonlogic",
            "expr": {"==": [{"var": "user.region"}, "EU"]}
        }
        context = {"user": {"region": "EU"}}
        
        # First evaluation
        result1 = self.evaluator.evaluate(condition, context)
        
        # Second evaluation should use cache
        result2 = self.evaluator.evaluate(condition, context)
        
        assert result1 == result2
        assert len(self.evaluator._compiled_cache) == 1
```

### Integration Testing
**End-to-End Flow Testing**

```python
from django.test import TestCase
from django.contrib.auth.models import User
from rules_engine.models import Rule, RuleEntryPoint, MessageTemplate
from rules_engine.services import RuleEngine

class TestRuleEngineIntegration(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com"
        )
        
        # Create test data
        self.entry_point = RuleEntryPoint.objects.create(
            name="checkout_terms",
            description="Checkout terms acceptance"
        )
        
        self.template = MessageTemplate.objects.create(
            id="tmpl_terms",
            name="Terms Template",
            content="Please accept our terms",
            format="html"
        )
        
        self.rule = Rule.objects.create(
            name="EU Terms Rule",
            entry_point=self.entry_point,
            condition={
                "type": "jsonlogic",
                "expr": {"==": [{"var": "user.region"}, "EU"]}
            },
            actions=[{
                "type": "user_acknowledge",
                "messageTemplateId": "tmpl_terms",
                "ackKey": "terms_eu",
                "required": True
            }],
            active=True,
            priority=10
        )
        
    def test_complete_checkout_flow(self):
        """Test complete checkout terms flow"""
        rule_engine = RuleEngine()
        
        context = {
            "user": {
                "id": str(self.user.id),
                "region": "EU",
                "email": "test@example.com"
            },
            "cart": {
                "total": 99.99,
                "items": [{"id": "prod_1", "quantity": 1}]
            }
        }
        
        # Execute rules
        result = rule_engine.execute("checkout_terms", context)
        
        # Verify results
        self.assertTrue(result["blocked"])
        self.assertEqual(len(result["effects"]), 1)
        
        effect = result["effects"][0]
        self.assertEqual(effect["type"], "user_acknowledge")
        self.assertEqual(effect["ackKey"], "terms_eu")
        self.assertTrue(effect["required"])
        
        # Verify execution was logged
        from rules_engine.models import RuleExecution
        execution = RuleExecution.objects.filter(
            rule_id=self.rule.id,
            entry_point="checkout_terms"
        ).first()
        
        self.assertIsNotNone(execution)
        self.assertEqual(execution.outcome, "action_required")
```

### Performance Testing
**Load Testing for High-Volume Scenarios**

```python
import pytest
import time
from concurrent.futures import ThreadPoolExecutor
from rules_engine.services import RuleEngine

class TestRuleEnginePerformance:
    def setup_method(self):
        self.rule_engine = RuleEngine()
        
    def test_single_execution_performance(self):
        """Test single rule execution performance"""
        context = {
            "user": {"region": "EU", "id": "u123"},
            "cart": {"total": 50, "items": []}
        }
        
        start_time = time.time()
        result = self.rule_engine.execute("checkout_terms", context)
        execution_time = time.time() - start_time
        
        # Should complete in under 100ms
        assert execution_time < 0.1
        assert "effects" in result
        
    def test_concurrent_execution_performance(self):
        """Test concurrent rule execution performance"""
        def execute_rule(thread_id):
            context = {
                "user": {"region": "EU", "id": f"u{thread_id}"},
                "cart": {"total": 50, "items": []}
            }
            return self.rule_engine.execute("checkout_terms", context)
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(execute_rule, i) for i in range(100)]
            results = [f.result() for f in futures]
        
        total_time = time.time() - start_time
        
        # 100 concurrent executions should complete in under 5 seconds
        assert total_time < 5.0
        assert len(results) == 100
        assert all("effects" in result for result in results)
        
    def test_cache_performance(self):
        """Test caching effectiveness for performance"""
        context = {
            "user": {"region": "EU", "id": "u123"},
            "cart": {"total": 50, "items": []}
        }
        
        # First execution (cache miss)
        start_time = time.time()
        result1 = self.rule_engine.execute("checkout_terms", context)
        first_time = time.time() - start_time
        
        # Second execution (cache hit)
        start_time = time.time()
        result2 = self.rule_engine.execute("checkout_terms", context)
        second_time = time.time() - start_time
        
        # Cached execution should be significantly faster
        assert second_time < first_time * 0.5
        assert result1 == result2
```

## Implementation Checklist

### Phase 1: Core Infrastructure ✓
- [ ] **RuleEngine Service**: Main orchestrator with execute() method
- [ ] **RuleRepository**: Database operations with caching
- [ ] **Database Models**: Rule, RulesFields, RuleExecution with JSONB
- [ ] **Basic API Endpoints**: `/api/rules/engine/execute/`
- [ ] **Configuration**: Django settings and database migrations

### Phase 2: Rule Processing ✓
- [ ] **Validator Component**: JSON Schema validation for context
- [ ] **ConditionEvaluator**: JSONLogic integration with caching
- [ ] **ActionDispatcher**: Command pattern implementation
- [ ] **Action Handlers**: DisplayMessage, DisplayModal, UserAcknowledge handlers
- [ ] **MessageTemplateService**: Multi-format template rendering

### Phase 3: Security & Safety ✓
- [ ] **Custom Function Registry**: Sandboxed function execution
- [ ] **Template Security**: XSS prevention and sanitization
- [ ] **Update Action Safety**: Allow-lists and transaction support
- [ ] **Rate Limiting**: Template rendering and API endpoint limits
- [ ] **Input Validation**: Comprehensive context and rule validation

### Phase 4: Performance Optimization ✓
- [ ] **Multi-level Caching**: Memory + Redis cache implementation
- [ ] **Database Indexing**: JSONB and performance indexes
- [ ] **Query Optimization**: select_related and prefetch_related
- [ ] **Lightweight Engine**: Fast path for non-critical entry points
- [ ] **Expression Pre-compilation**: AST caching for conditions

### Phase 5: Observability ✓
- [ ] **Metrics Collection**: Prometheus metrics integration
- [ ] **Structured Logging**: Context-aware logging with sanitization
- [ ] **Execution Auditing**: Complete RuleExecution trail
- [ ] **Performance Monitoring**: Latency and error rate tracking
- [ ] **Alerting System**: Proactive monitoring and notifications

### Phase 6: Admin Interface ✓
- [ ] **Django Admin Integration**: Rule creation and management
- [ ] **Dry-run Mode**: Rule simulation without side effects
- [ ] **Rule Versioning**: Version control and rollback capabilities
- [ ] **Execution Viewer**: Rule execution history and debugging
- [ ] **Test Case Management**: Stored test vectors for rules

### Phase 7: Frontend Integration ✓
- [ ] **React Components**: Effect rendering (messages, modals, acknowledgments)
- [ ] **API Integration**: Frontend service for rule engine calls
- [ ] **State Management**: Rule effects and acknowledgment state
- [ ] **Error Handling**: User-friendly error messages and fallbacks
- [ ] **Performance Optimization**: Client-side caching and batching

### Phase 8: Testing & Quality Assurance ✓
- [ ] **Unit Tests**: Comprehensive test coverage for all components
- [ ] **Integration Tests**: End-to-end flow testing
- [ ] **Performance Tests**: Load testing and benchmarking
- [ ] **Security Tests**: Penetration testing and vulnerability assessment
- [ ] **User Acceptance Testing**: Business workflow validation

### Phase 9: Production Deployment ✓
- [ ] **Environment Configuration**: Production settings and secrets
- [ ] **Database Migration**: Schema deployment and data migration
- [ ] **Monitoring Setup**: Production metrics and alerting
- [ ] **Documentation**: Admin user guides and troubleshooting
- [ ] **Training**: Staff training on rule management

### Phase 10: Post-Launch ✓
- [ ] **Performance Monitoring**: Production performance validation
- [ ] **Rule Creation**: Initial business rule implementation
- [ ] **Feedback Integration**: User feedback and iteration
- [ ] **Advanced Features**: DAG-based flows, event-driven rules
- [ ] **Optimization**: Performance tuning based on usage patterns

## Conclusion

This comprehensive architecture specification provides a robust, scalable, and secure foundation for Admin3's Rules Engine. The design emphasizes:

- **Consistency**: Deterministic rule evaluation across all entry points
- **Security**: Sandboxed execution and comprehensive input validation
- **Performance**: Multi-level caching and optimized database queries
- **Observability**: Complete audit trail and performance monitoring
- **Maintainability**: Clean architecture with separation of concerns

The implementation approach follows industry best practices for enterprise rule engines while maintaining the flexibility needed for dynamic business requirements. The phased rollout plan ensures systematic development and testing, minimizing risk during deployment.

Key success factors:
1. **Thorough testing** at each phase before proceeding
2. **Performance benchmarking** against current system
3. **Security review** of all custom function capabilities
4. **Staff training** on rule authoring and management
5. **Gradual migration** from existing rule implementations

This architecture positions Admin3's Rules Engine as a powerful, reliable business rule management platform capable of supporting complex workflows while maintaining excellent performance and security standards.
# Contributing to CSV Wizard Pro

Vielen Dank für Ihr Interesse daran, zu CSV Wizard Pro beizutragen! 🎉

## 🚀 Schnellstart für Entwickler

### Entwicklungsumgebung einrichten

1. **Repository forken und klonen**
   ```bash
   git clone https://github.com/yourusername/csv-wizard-pro.git
   cd csv-wizard-pro
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

4. **Öffnen Sie http://localhost:5173**

## 📋 Wie Sie beitragen können

### 🐛 Bug Reports

Wenn Sie einen Bug finden:

1. **Prüfen Sie zuerst die [Issues](https://github.com/yourusername/csv-wizard-pro/issues)**
2. **Erstellen Sie ein neues Issue** mit:
   - Klare Beschreibung des Problems
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - Screenshots (wenn hilfreich)
   - Browser/OS Information

### 💡 Feature Requests

Für neue Funktionen:

1. **Öffnen Sie eine [Discussion](https://github.com/yourusername/csv-wizard-pro/discussions)**
2. **Beschreiben Sie:**
   - Das Problem, das gelöst werden soll
   - Ihre vorgeschlagene Lösung
   - Warum das Feature wertvoll wäre

### 🔧 Code Contributions

#### Bevor Sie starten

1. **Issue öffnen** oder einem bestehenden Issue zuweisen lassen
2. **Branch erstellen** von `main`:
   ```bash
   git checkout -b feature/descriptive-name
   ```

#### Entwicklungsrichtlinien

- **TypeScript verwenden** - Alle neuen Dateien sollten TypeScript sein
- **Tests schreiben** - Fügen Sie Tests für neue Funktionen hinzu
- **Code-Style befolgen** - Nutzen Sie `npm run lint`
- **Commit-Konventionen** befolgen (siehe unten)

#### Commit-Nachrichten

Verwenden Sie [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add template export functionality
fix: resolve CSV parsing issue with special characters
docs: update installation instructions
style: improve button hover states
refactor: simplify file processing logic
test: add unit tests for transformation engine
```

## 🏗️ Projektstruktur

```
src/
├── components/
│   ├── ui/                 # shadcn/ui Basis-Komponenten
│   ├── csv/               # CSV-spezifische Komponenten
│   │   ├── SimpleCSVWizard.tsx
│   │   ├── steps/         # Wizard-Schritte
│   │   └── workflows/     # Workflow-Implementierungen
│   └── ...
├── lib/                   # Utility-Bibliotheken
├── hooks/                 # Custom React Hooks
└── pages/                 # Route-Komponenten
```

## 🎨 Design Guidelines

### UI/UX Prinzipien

- **Einfachheit** - Intuitive, selbsterklärende Benutzeroberflächen
- **Konsistenz** - Einheitliche Patterns und Komponenten
- **Zugänglichkeit** - ARIA-konform und tastaturnavigierbar
- **Performance** - Optimiert für verschiedene Gerätegrößen

### Code-Style

- **Funktionale Komponenten** mit Hooks
- **TypeScript** für Typsicherheit
- **Tailwind CSS** für Styling
- **shadcn/ui** für UI-Komponenten

```typescript
// ✅ Gut
const MyComponent: React.FC<Props> = ({ data }) => {
  const [state, setState] = useState<string>('');
  
  return (
    <Card className="w-full">
      <CardContent>{data.name}</CardContent>
    </Card>
  );
};

// ❌ Vermeiden
function MyComponent(props) {
  return <div style={{width: '100%'}}>{props.data.name}</div>;
}
```

## 🧪 Testing

### Tests ausführen

```bash
npm run test              # Alle Tests
npm run test:watch        # Watch-Modus
npm run test:coverage     # Coverage-Report
```

### Test-Richtlinien

- **Unit Tests** für Utility-Funktionen
- **Integration Tests** für Komponenten
- **E2E Tests** für kritische User-Flows

```typescript
// Beispiel Unit Test
import { transformCSVData } from '../lib/transformationEngine';

describe('transformCSVData', () => {
  it('should transform data correctly', () => {
    const input = [['Name', 'Email'], ['John', 'john@example.com']];
    const template = { /* ... */ };
    
    const result = transformCSVData(input, template);
    
    expect(result).toEqual(expectedOutput);
  });
});
```

## 📦 Pull Request Process

1. **Branch aktualisieren**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Tests durchführen**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

3. **Pull Request erstellen**
   - Klare Beschreibung der Änderungen
   - Screenshots für UI-Änderungen
   - Verknüpfung zum zugehörigen Issue

4. **Code Review abwarten**
   - Reagieren Sie auf Feedback
   - Führen Sie angeforderte Änderungen durch

## 🏷️ Release Process

1. **Version bump** in `package.json`
2. **Changelog** aktualisieren
3. **Tag erstellen**
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

## 💬 Community

- **GitHub Discussions** - Für Fragen und Ideen
- **Issues** - Für Bug Reports und Feature Requests
- **Wiki** - Für ausführliche Dokumentation

## 📄 Lizenz

Durch Ihren Beitrag stimmen Sie zu, dass Ihre Beiträge unter der MIT-Lizenz lizenziert werden.

---

**Vielen Dank für Ihren Beitrag! 🙏**
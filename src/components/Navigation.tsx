import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Workflow,
  Eye,
  Settings,
  Zap,
  Database,
  Brain,
  Palette
} from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const navigationItems = [
    {
      path: '/',
      label: 'ETL Wizard',
      icon: Zap,
      description: 'Schritt-für-Schritt Datenverarbeitung'
    },
    {
      path: '/preview',
      label: 'Datenvorschau',
      icon: Eye,
      description: 'Import & Vorschau von Dateien'
    },
    {
      path: '/workflows',
      label: 'Workflow Hub',
      icon: Workflow,
      description: 'Gespeicherte Workflows verwalten'
    },
    {
      path: '/editor',
      label: 'Visueller Editor',
      icon: Palette,
      description: 'Drag-and-Drop Workflow-Editor'
    },
    {
      path: '/settings',
      label: 'Einstellungen',
      icon: Settings,
      description: 'KI-Konfiguration & Updates'
    }
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-data bg-clip-text text-transparent">
              ETL Platform
            </span>
          </Link>

          {/* Navigation Items */}
          <div className="flex space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2 px-4"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* AI Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline">AI Ready</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
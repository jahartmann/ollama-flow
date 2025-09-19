import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Workflow,
  Eye,
  Settings,
  Zap,
  Database,
  Brain,
  Palette,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const [showAIFeatures, setShowAIFeatures] = useState(false);

  const aiNavigationItems = [
    {
      path: '/ai-chat',
      label: 'KI-Chat',
      icon: MessageSquare,
      description: 'Intelligenter Assistent für Ihre Daten'
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
              CSV Transformer
            </span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {/* Main CSV Transformer Tab */}
            <Link to="/">
              <Button
                variant={location.pathname === '/' ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2 px-4"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">CSV Transformer</span>
              </Button>
            </Link>

            {/* AI Features Toggle */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIFeatures(!showAIFeatures)}
                className="flex items-center gap-1 px-3"
              >
                <Brain className="w-4 h-4" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showAIFeatures ? 'rotate-180' : ''}`} />
              </Button>

              {/* AI Features Dropdown */}
              {showAIFeatures && (
                <div className="absolute right-0 mt-2 w-48 bg-popover border rounded-md shadow-lg z-50">
                  <div className="py-1">
                    {aiNavigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setShowAIFeatures(false)}>
                          <div className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted cursor-pointer ${
                            isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                          }`}>
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';

// ...other imports remain the same

export default function BotPage() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('ai');

  useEffect(() => {
    if (location.startsWith('/active-bots')) {
      setActiveTab('executions');
      return;
    }
    if (location.startsWith('/auto-bots')) {
      setActiveTab('ai');
      return;
    }
  }, [location]);

  // --- Smart Scanner States ---
  const [smartScannerCapital, setSmartScannerCapital] = useState('');
  const [smartScannerMaxBots, setSmartScannerMaxBots] = useState('');
  const [smartScannerLeverage, setSmartScannerLeverage] = useState('');
  const [smartScannerName, setSmartScannerName] = useState('');
  const [isSmartScanning, setIsSmartScanning] = useState(false);
  const [smartScannerResults, setSmartScannerResults] = useState<any>(null);
  const [smartScannerStopLoss, setSmartScannerStopLoss] = useState('');
  const [smartScannerTakeProfit, setSmartScannerTakeProfit] = useState('');
  const [useSmartScannerTPSL, setUseSmartScannerTPSL] = useState(false);

  // --- Smart Scanner Mutation ---
  const smartScannerScanMutation = useMutation({
    mutationFn: async (scannerData: any) => {
      const response = await fetch('/api/auto-scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scannerData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to scan market: ${error}`);
      }
      return response.json();
    },
    onSuccess: (results) => {
      setSmartScannerResults(results);
      setIsSmartScanning(false);
      toast({
        title: 'Smart Scan Complete! 🔍',
        description: `Found ${results.opportunities.length} trading opportunities`,
      });
    },
    onError: (error: any) => {
      setIsSmartScanning(false);
      toast({
        title: 'Smart Scanner Failed',
        description: error.message || 'Failed to complete smart scan',
        variant: 'destructive',
      });
    },
  });

  // --- Smart Scanner Deploy Mutation ---
  const smartScannerDeployMutation = useMutation({
    mutationFn: async (deployData: any) => {
      const response = await fetch('/api/auto-scanner/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to deploy bots: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Smart Scanner Deployment 🚀',
        description: 'Smart Scanner bots deployed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Smart Scanner Deployment Failed',
        description: error.message || 'Failed to deploy bots.',
        variant: 'destructive',
      });
    },
  });

  // --- Handlers ---
  const handleSmartScannerScan = async () => {
    setIsSmartScanning(true);
    setSmartScannerResults(null);

    const scannerData = {
      userId: 'default-user',
      maxBots: parseInt(smartScannerMaxBots),
      leverage: parseFloat(smartScannerLeverage),
      capital: parseFloat(smartScannerCapital),
      customTPSL: useSmartScannerTPSL
        ? {
            stopLoss: parseFloat(smartScannerStopLoss),
            takeProfit: parseFloat(smartScannerTakeProfit),
          }
        : null,
    };

    await smartScannerScanMutation.mutateAsync(scannerData);
  };

  const handleStopSmartScanner = async () => {
    setIsSmartScanning(false);
    setSmartScannerResults(null);
    toast({
      title: 'Smart Scanner stopped',
      description: 'You have manually stopped the Smart Scanner.',
    });
  };

  // Keep the rest of your BotPage JSX/layout and tabs as-is.
}

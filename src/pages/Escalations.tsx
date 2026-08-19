import React, { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { io, Socket } from 'socket.io-client';

interface Escalation {
    id: string;
    customerId: string;
    customer: {
        name: string;
        phone: string;
        email: string;
    };
    reason: string;
    status: string;
    createdAt: string;
}

import { API_BASE_URL } from '@/config';

export default function Escalations() {
    const [escalations, setEscalations] = useState<Escalation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const socketRef = useRef<Socket | null>(null);

    const fetchEscalations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/escalations`);
            if (!res.ok) throw new Error('Failed to fetch escalations');
            const data = await res.json();
            setEscalations(data);
            setError('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Show browser notification
    const showBrowserNotification = (escalation: Escalation) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const customerName = escalation.customer?.name || 'Unknown Customer';
            new Notification('New Escalation', {
                body: `${customerName} needs assistance: ${escalation.reason || 'No reason provided'}`,
                icon: '/favicon.ico',
                tag: `escalation-${escalation.id}`,
            });
        }
    };

    useEffect(() => {
        fetchEscalations();
        
        // Initialize WebSocket connection
        socketRef.current = io(API_BASE_URL, {
            transports: ['websocket', 'polling'],
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket for escalations');
            // Join the admin room to receive escalation events
            socketRef.current?.emit('join', { platform: 'admin' });
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });

        // Listen for new escalations
        socketRef.current.on('newEscalation', (escalation: Escalation) => {
            console.log('New escalation received:', escalation);
            setEscalations(prev => {
                // Check if escalation already exists
                if (prev.find(e => e.id === escalation.id)) {
                    return prev;
                }
                // Add new escalation at the beginning
                return [escalation, ...prev];
            });
            showBrowserNotification(escalation);
        });

        // Backward-compatible path: server may emit generic admin notifications.
        // When an escalation notification arrives, refresh the list.
        socketRef.current.on('newNotification', (notification: any) => {
            if (notification?.type === 'escalation') {
                fetchEscalations();
            }
        });

        // Listen for escalation resolved
        socketRef.current.on('escalationResolved', ({ escalationId }: { escalationId: string }) => {
            console.log('Escalation resolved:', escalationId);
            setEscalations(prev => prev.filter(e => e.id !== escalationId));
        });

        // Auto-refresh every 30 seconds (fallback)
        const interval = setInterval(() => {
            fetchEscalations();
        }, 30000);

        return () => {
            clearInterval(interval);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleResolve = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/escalations/${id}/resolve`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to resolve');
            // Refresh list
            fetchEscalations();
        } catch (err: any) {
            alert('Error resolving escalation: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Escalations & Human Handoff</h1>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {escalations.length === 0 && !error ? (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">All Clear!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        No open escalations. Great job! 🎉
                    </AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Open Escalations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {escalations.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.customer?.name || 'Unknown'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{row.customer?.phone}</span>
                                                <span className="text-xs text-muted-foreground">{row.customer?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{row.reason || 'No reason provided'}</TableCell>
                                        <TableCell>{format(new Date(row.createdAt), 'MMM d, h:mm a')}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'OPEN' ? 'destructive' : 'default'}>
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {row.status === 'OPEN' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleResolve(row.id)}
                                                >
                                                    Resolve & Unpause AI
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

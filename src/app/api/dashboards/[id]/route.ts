'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import type { SavedDashboard } from '@/lib/types';

const dataFilePath = path.join(process.cwd(), 'src/data/dashboards.json');

async function readData(): Promise<SavedDashboard[]> {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeData(data: SavedDashboard[]): Promise<void> {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/dashboards/[id]
// Fetches a single dashboard with its full data.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const dashboards = await readData();
        const dashboard = dashboards.find(d => d.id === id);

        if (dashboard) {
            return NextResponse.json(dashboard);
        } else {
            return NextResponse.json({ message: 'Dashboard not found' }, { status: 404 });
        }
    } catch (error) {
        console.error(`Failed to get dashboard ${params.id}:`, error);
        return NextResponse.json({ message: 'Failed to retrieve dashboard' }, { status: 500 });
    }
}

// DELETE /api/dashboards/[id]
// Deletes a dashboard.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const dashboards = await readData();
        const updatedDashboards = dashboards.filter(d => d.id !== id);

        if (dashboards.length === updatedDashboards.length) {
            return NextResponse.json({ message: 'Dashboard not found' }, { status: 404 });
        }

        await writeData(updatedDashboards);
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`Failed to delete dashboard ${params.id}:`, error);
        return NextResponse.json({ message: 'Failed to delete dashboard' }, { status: 500 });
    }
}

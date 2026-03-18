import { z } from 'zod';

export const createLiveRoomSchema = z.object({
	title: z.string().trim().min(2, 'Title must be at least 2 characters.').max(120)
});

export const addLiveViewerSchema = z.object({
	userId: z.string().min(1, 'Viewer is required.')
});

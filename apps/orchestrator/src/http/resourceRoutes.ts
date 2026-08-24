import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@fivem-ai/db';
import { requireAuth } from '../auth';
import {
  assertServerAccess,
  assertInstallAccess,
} from '../auth/access';

const PUBLIC_RESOURCE_CATALOG: Array<{
  slug: string;
  name: string;
  category: string;
  description: string;
  type: 'script' | 'map' | 'sound' | 'config';
  downloads: number;
  tags: string[];
}> = [
  { slug: 'qb-core', name: 'QBCore Framework', category: 'framework', description: 'Popular FiveM RP framework with jobs, inventory, and vehicles.', type: 'script', downloads: 2400000, tags: ['framework', 'rp', 'inventory'] },
  { slug: 'esx', name: 'ESX Framework', category: 'framework', description: 'Classic FiveM RP framework with jobs, properties, and inventory.', type: 'script', downloads: 1800000, tags: ['framework', 'rp', 'inventory'] },
  { slug: 'qb-smallclaims', name: 'QB Small Claims', category: 'jobs', description: 'Insurance job with towing and claims system.', type: 'script', downloads: 450000, tags: ['job', 'towing', 'rp'] },
  { slug: 'qb-policeapi', name: 'QB Police API', category: 'jobs', description: 'Police job with weapon licensing and call system.', type: 'script', downloads: 380000, tags: ['job', 'police', 'rp'] },
  { slug: 'ps-menu', name: 'PS Admin Menu', category: 'admin', description: 'Advanced admin menu for server management.', type: 'script', downloads: 1200000, tags: ['admin', 'menu', 'tools'] },
  { slug: 'ox_lib', name: 'ox_lib', category: 'dependency', description: 'Essential library required by many modern resources.', type: 'script', downloads: 3000000, tags: ['dependency', 'library'] },
  { slug: 'ox_target', name: 'ox_target', category: 'dependency', description: 'Target/interaction system for fivem resources.', type: 'script', downloads: 1500000, tags: ['dependency', 'target'] },
  { slug: 'ox_inventory', name: 'ox_inventory', category: 'inventory', description: 'Modern inventory system with crafting support.', type: 'script', downloads: 900000, tags: ['inventory', 'crafting'] },
  { slug: 'esx_license', name: 'ESX License', category: 'jobs', description: 'Weapon and driver license system for ESX.', type: 'script', downloads: 320000, tags: ['license', 'weapon', 'drive'] },
  { slug: 'qb-cloth', name: 'QB Clothing', category: 'jobs', description: 'Clothing store and character customization.', type: 'script', downloads: 280000, tags: ['clothing', 'outfit', 'rp'] },
  { slug: 'qb-drugs', name: 'QB Drugs', category: 'jobs', description: 'Full drug manufacturing and selling system.', type: 'script', downloads: 310000, tags: ['drugs', 'crime', 'rp'] },
  { slug: 'qb-weathersync', name: 'QB Weather Sync', category: 'config', description: 'Syncs weather between all players on the server.', type: 'script', downloads: 190000, tags: ['weather', 'sync', 'config'] },
  { slug: 'rp-entrainment', name: 'RP Entrainment', category: 'config', description: 'NPC traffic and player vehicle animations.', type: 'script', downloads: 220000, tags: ['npc', 'traffic', 'animation'] },
  { slug: 'jazzmaster-hud', name: 'Jazzmaster HUD', category: 'config', description: 'Clean and minimal HUD for FiveM servers.', type: 'script', downloads: 560000, tags: ['hud', 'ui', 'minimal'] },
  { slug: 'vorp_core', name: 'vORP Core', category: 'framework', description: 'Alternative framework with built-in inventory and jobs.', type: 'script', downloads: 400000, tags: ['framework', 'rp', 'inventory'] },
  { slug: 'nd_core', name: 'ND Core', category: 'framework', description: 'Next-gen framework with optimized systems.', type: 'script', downloads: 150000, tags: ['framework', 'rp', 'modern'] },
  { slug: 'legacy-assets', name: 'Legacy Assets', category: 'map', description: 'Original GTA V assets for custom map making.', type: 'map', downloads: 890000, tags: ['map', 'assets', 'mapping'] },
  { slug: 'snip-cardealer', name: 'SNIp Car Dealer', category: 'jobs', description: 'Vehicle dealership and sale system.', type: 'script', downloads: 180000, tags: ['job', 'cars', 'business'] },
  { slug: 'qb-mechanicjob', name: 'QB Mechanic Job', category: 'jobs', description: 'Full mechanic job with vehicle repair and tuning.', type: 'script', downloads: 210000, tags: ['job', 'mechanic', 'cars'] },
  { slug: 'qb-hunting', name: 'QB Hunting', category: 'jobs', description: 'Hunting system with skins and cooking.', type: 'script', downloads: 95000, tags: ['job', 'hunting', 'rp'] },
  { slug: 'qb-traphouse', name: 'QB Trap House', category: 'jobs', description: 'Illegal trap house business job.', type: 'script', downloads: 130000, tags: ['job', 'drugs', 'crime'] },
  { slug: 'ox_vehicles', name: 'ox_vehicles', category: 'config', description: 'Modern vehicle handling and damage system.', type: 'script', downloads: 420000, tags: ['vehicle', 'handling', 'config'] },
  { slug: 'pma-voice', name: 'PMA Voice', category: 'config', description: 'Advanced voice chat with proximity and radio.', type: 'script', downloads: 680000, tags: ['voice', 'radio', 'proximity'] },
  { slug: 'illenium-appearance', name: 'illenium Appearance', category: 'config', description: 'Character customisation and wardrobe system.', type: 'script', downloads: 750000, tags: ['appearance', 'wardrobe', 'rp'] },
  { slug: 'rp-radio', name: 'RP Radio', category: 'config', description: 'In-game radio with music and talk stations.', type: 'script', downloads: 340000, tags: ['radio', 'music', 'rp'] },
];

export async function registerResourceRoutes(fastify: FastifyInstance) {
  // Browse public FiveM resources (no auth required)
  fastify.get('/api/resources/catalog', async (request, reply) => {
    const query = z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      type: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }).parse(request.query as any);

    let filtered = PUBLIC_RESOURCE_CATALOG;

    if (query.category) {
      filtered = filtered.filter((r) => r.category === query.category);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)),
      );
    }
    if (query.type) {
      filtered = filtered.filter((r) => r.type === query.type);
    }

    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')));
    const total = filtered.length;
    const items = filtered.slice((page - 1) * limit, page * limit);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Get a single resource by slug
  fastify.get('/api/resources/catalog/:slug', async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const resource = PUBLIC_RESOURCE_CATALOG.find((r) => r.slug === slug);
    if (!resource) return reply.code(404).send({ error: 'Resource not found' });
    return resource;
  });

  // Submit a resource (no auth — returns 202 for manual review)
  fastify.post('/api/resources/catalog/submit', async (request, reply) => {
    const body = z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(100),
      category: z.enum(['framework', 'jobs', 'admin', 'inventory', 'dependency', 'map', 'config']),
      description: z.string().max(1000),
      type: z.enum(['script', 'map', 'sound', 'config']),
      tags: z.array(z.string()).max(10),
      downloadUrl: z.string().url().optional(),
      githubUrl: z.string().url().optional(),
    }).parse(request.body);

    if (PUBLIC_RESOURCE_CATALOG.some((r) => r.slug === body.slug)) {
      return reply.code(409).send({ error: 'Slug already taken' });
    }

    return reply.code(202).send({
      message: 'Resource submitted for review',
      slug: body.slug,
    });
  });

  // Install a resource (requires auth + server)
  fastify.post('/api/resources/install', async (request, reply) => {
    const { serverId, slug } = z.object({
      serverId: z.string(),
      slug: z.string(),
    }).parse(request.body);

    requireAuth(request, reply);

    const server = await assertServerAccess(request, reply, serverId);
    if (!server) return;

    const resource = PUBLIC_RESOURCE_CATALOG.find((r) => r.slug === slug);
    if (!resource) return reply.code(404).send({ error: 'Resource not found' });

    // Check if already installed or installing
    const existing = await prisma.resourceInstall.findFirst({
      where: { serverId, slug, status: { in: ['installing', 'installed'] } },
    });
    if (existing) {
      return reply.code(409).send({
        error: 'Resource is already being installed or is installed',
        install: existing,
      });
    }

    const install = await prisma.resourceInstall.create({
      data: {
        serverId,
        slug: resource.slug,
        name: resource.name,
        status: 'installing',
        progress: 0,
        startedAt: new Date(),
      },
    });

    // Simulate async install progress
    fastify.log.info(`Starting resource install: ${resource.name} for server ${serverId}`);

    // Use a timer to simulate the install process
    setTimeout(async () => {
      try {
        // Simulate progress steps
        const steps = [
          { progress: 25, message: 'Downloading...' },
          { progress: 50, message: 'Extracting files...' },
          { progress: 75, message: 'Writing files...' },
          { progress: 90, message: 'Verifying install...' },
        ];

        for (const step of steps) {
          await new Promise((r) => setTimeout(r, 800));
          await prisma.resourceInstall.update({
            where: { id: install.id },
            data: { progress: step.progress },
          });
        }

        // Mark as installed
        await prisma.resourceInstall.update({
          where: { id: install.id },
          data: {
            status: 'installed',
            progress: 100,
            completedAt: new Date(),
          },
        });

        fastify.log.info(`Resource installed successfully: ${resource.name} for server ${serverId}`);
      } catch (err) {
        // Mark as failed
        await prisma.resourceInstall.update({
          where: { id: install.id },
          data: {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            failedAt: new Date(),
          },
        });
        fastify.log.error(`Resource install failed: ${resource.name} - ${err}`);
      }
    }, 100);

    return reply.code(200).send({ install });
  });

  // Get install history for a server
  fastify.get('/api/resources/installs/:serverId', async (request, reply) => {
    const { serverId } = z.object({
      serverId: z.string(),
    }).parse(request.params);

    requireAuth(request, reply);

    if (!await assertServerAccess(request, reply, serverId)) return;

    const installs = await prisma.resourceInstall.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return installs;
  });

  // Rollback a resource install
  fastify.post('/api/resources/installs/:installId/rollback', async (request, reply) => {
    const { installId } = z.object({
      installId: z.string(),
    }).parse(request.params);

    requireAuth(request, reply);

    const install = await assertInstallAccess(request, reply, installId);
    if (!install) return;

    if (install.status !== 'installed') {
      return reply.code(400).send({ error: 'Resource is not in installed state' });
    }

    // Mark rollback requested
    await prisma.resourceInstall.update({
      where: { id: installId },
      data: { status: 'rollback_requested' },
    });

    // Simulate rollback
    setTimeout(async () => {
      try {
        await prisma.resourceInstall.update({
          where: { id: installId },
          data: {
            status: 'rollbacked',
            rolledBackAt: new Date(),
          },
        });
        fastify.log.info(`Resource rolled back: ${install.name} for server ${install.serverId}`);
      } catch (err) {
        fastify.log.error(`Rollback failed: ${install.name} - ${err}`);
      }
    }, 500);

    return reply.code(200).send({ message: 'Rollback initiated' });
  });
}

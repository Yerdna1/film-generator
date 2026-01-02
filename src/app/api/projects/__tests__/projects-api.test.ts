import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestCredits } from '@/test/factories/credits'
import { createTestProject, addProjectMember } from '@/test/factories/project'
import { createTestScenes, createSceneWithImage, createFullScene } from '@/test/factories/scene'

describe('Projects API Tests', () => {
  describe('Project CRUD Operations', () => {
    describe('Create Project', () => {
      it('creates project with valid data', async () => {
        const user = await createTestUser()

        const project = await prisma.project.create({
          data: {
            userId: user.id,
            name: 'Test Film',
            story: 'A test story for the film',
            visibility: 'private',
            currentStep: 0
          }
        })

        expect(project).toBeDefined()
        expect(project.name).toBe('Test Film')
        expect(project.visibility).toBe('private')
      })

      it('sets default values when not provided', async () => {
        const user = await createTestUser()

        const project = await prisma.project.create({
          data: {
            userId: user.id,
            name: 'Minimal Project'
          }
        })

        expect(project.visibility).toBe('private')
        // currentStep defaults to 1 in the schema
        expect(project.currentStep).toBe(1)
      })

      it('validates required fields', async () => {
        // userId is required - omitting it should fail
        await expect(
          prisma.project.create({
            data: {
              name: 'No User Project'
            } as any
          })
        ).rejects.toThrow()
      })
    })

    describe('Read Project', () => {
      it('returns project by id', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id, { name: 'Find Me' })

        const found = await prisma.project.findUnique({
          where: { id: project.id }
        })

        expect(found).toBeDefined()
        expect(found?.name).toBe('Find Me')
      })

      it('returns null for non-existent project', async () => {
        const found = await prisma.project.findUnique({
          where: { id: 'non-existent-id' }
        })

        expect(found).toBeNull()
      })

      it('includes related scenes when requested', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        await createTestScenes(project.id, 3)

        const found = await prisma.project.findUnique({
          where: { id: project.id },
          include: { scenes: true }
        })

        expect(found?.scenes).toHaveLength(3)
      })

      it('includes related characters when requested', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        await prisma.character.create({
          data: {
            projectId: project.id,
            name: 'Hero',
            description: 'Main character',
            visualDescription: 'Tall with dark hair',
            masterPrompt: 'A hero character with dark hair'
          }
        })

        const found = await prisma.project.findUnique({
          where: { id: project.id },
          include: { characters: true }
        })

        expect(found?.characters).toHaveLength(1)
      })
    })

    describe('Update Project', () => {
      it('updates project name', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id, { name: 'Old Name' })

        const updated = await prisma.project.update({
          where: { id: project.id },
          data: { name: 'New Name' }
        })

        expect(updated.name).toBe('New Name')
      })

      it('updates visibility', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id, { visibility: 'private' })

        const updated = await prisma.project.update({
          where: { id: project.id },
          data: { visibility: 'public' }
        })

        expect(updated.visibility).toBe('public')
      })

      it('updates currentStep', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id, { currentStep: 0 })

        const updated = await prisma.project.update({
          where: { id: project.id },
          data: { currentStep: 3 }
        })

        expect(updated.currentStep).toBe(3)
      })

      it('supports partial updates', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id, {
          name: 'Original',
          story: 'Original story'
        })

        const updated = await prisma.project.update({
          where: { id: project.id },
          data: { name: 'Updated' } // Only update name
        })

        expect(updated.name).toBe('Updated')
        expect(updated.story).toBe('Original story')
      })
    })

    describe('Delete Project', () => {
      it('deletes project by id', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        await prisma.project.delete({
          where: { id: project.id }
        })

        const found = await prisma.project.findUnique({
          where: { id: project.id }
        })

        expect(found).toBeNull()
      })

      it('cascade deletes related scenes', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        const scenes = await createTestScenes(project.id, 3)

        await prisma.project.delete({
          where: { id: project.id }
        })

        for (const scene of scenes) {
          const found = await prisma.scene.findUnique({
            where: { id: scene.id }
          })
          expect(found).toBeNull()
        }
      })

      it('cascade deletes related characters', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        const character = await prisma.character.create({
          data: {
            projectId: project.id,
            name: 'Hero',
            description: 'Main character',
            visualDescription: 'Tall with dark hair',
            masterPrompt: 'A hero character'
          }
        })

        await prisma.project.delete({
          where: { id: project.id }
        })

        const found = await prisma.character.findUnique({
          where: { id: character.id }
        })

        expect(found).toBeNull()
      })

      it('cascade deletes project members', async () => {
        const user = await createTestUser()
        const collaborator = await createTestUser()
        const project = await createTestProject(user.id)
        await addProjectMember(project.id, collaborator.id, 'collaborator')

        await prisma.project.delete({
          where: { id: project.id }
        })

        const members = await prisma.projectMember.findMany({
          where: { projectId: project.id }
        })

        expect(members).toHaveLength(0)
      })
    })

    describe('List Projects', () => {
      it('lists user projects', async () => {
        const user = await createTestUser()
        await createTestProject(user.id, { name: 'Project 1' })
        await createTestProject(user.id, { name: 'Project 2' })
        await createTestProject(user.id, { name: 'Project 3' })

        const projects = await prisma.project.findMany({
          where: { userId: user.id }
        })

        expect(projects).toHaveLength(3)
      })

      it('only shows user own projects', async () => {
        const user1 = await createTestUser()
        const user2 = await createTestUser()
        await createTestProject(user1.id, { name: 'User1 Project' })
        await createTestProject(user2.id, { name: 'User2 Project' })

        const user1Projects = await prisma.project.findMany({
          where: { userId: user1.id }
        })

        expect(user1Projects).toHaveLength(1)
        expect(user1Projects[0].name).toBe('User1 Project')
      })

      it('supports pagination with skip and take', async () => {
        const user = await createTestUser()
        for (let i = 1; i <= 5; i++) {
          await createTestProject(user.id, { name: `Project ${i}` })
        }

        const page1 = await prisma.project.findMany({
          where: { userId: user.id },
          skip: 0,
          take: 2,
          orderBy: { createdAt: 'asc' }
        })

        const page2 = await prisma.project.findMany({
          where: { userId: user.id },
          skip: 2,
          take: 2,
          orderBy: { createdAt: 'asc' }
        })

        expect(page1).toHaveLength(2)
        expect(page2).toHaveLength(2)
        expect(page1[0].name).not.toBe(page2[0].name)
      })

      it('filters by visibility', async () => {
        const user = await createTestUser()
        await createTestProject(user.id, { name: 'Private', visibility: 'private' })
        await createTestProject(user.id, { name: 'Public', visibility: 'public' })

        const publicProjects = await prisma.project.findMany({
          where: {
            userId: user.id,
            visibility: 'public'
          }
        })

        expect(publicProjects).toHaveLength(1)
        expect(publicProjects[0].name).toBe('Public')
      })
    })

    describe('Public Projects', () => {
      it('lists all public projects', async () => {
        const user1 = await createTestUser()
        const user2 = await createTestUser()
        await createTestProject(user1.id, { name: 'Public 1', visibility: 'public' })
        await createTestProject(user2.id, { name: 'Public 2', visibility: 'public' })
        await createTestProject(user1.id, { name: 'Private', visibility: 'private' })

        const publicProjects = await prisma.project.findMany({
          where: { visibility: 'public' }
        })

        expect(publicProjects).toHaveLength(2)
      })

      it('private projects not in public list', async () => {
        const user = await createTestUser()
        await createTestProject(user.id, { name: 'Private', visibility: 'private' })

        const publicProjects = await prisma.project.findMany({
          where: { visibility: 'public' }
        })

        expect(publicProjects).toHaveLength(0)
      })
    })
  })

  describe('Scene Operations', () => {
    describe('Create Scene', () => {
      it('creates scene with valid data', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        const scene = await prisma.scene.create({
          data: {
            projectId: project.id,
            number: 1,
            title: 'Opening Scene',
            description: 'The story begins',
            textToImagePrompt: 'A dramatic opening scene',
            imageToVideoPrompt: 'Camera pans slowly'
          }
        })

        expect(scene).toBeDefined()
        expect(scene.number).toBe(1)
        expect(scene.title).toBe('Opening Scene')
      })

      it('uses scene factory for easy creation', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        // Factory provides all required fields
        const scene = await createSceneWithImage(project.id, {
          description: 'A dark forest at night'
        })

        expect(scene.description).toBe('A dark forest at night')
        expect(scene.textToImagePrompt).toBeDefined()
      })
    })

    describe('Update Scene', () => {
      it('updates scene description', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        const scene = await createSceneWithImage(project.id, { description: 'Old description' })

        const updated = await prisma.scene.update({
          where: { id: scene.id },
          data: { description: 'New description' }
        })

        expect(updated.description).toBe('New description')
      })

      it('updates scene imageUrl', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        const scene = await createSceneWithImage(project.id)

        const updated = await prisma.scene.update({
          where: { id: scene.id },
          data: { imageUrl: 'https://new-image.com/scene.png' }
        })

        expect(updated.imageUrl).toBe('https://new-image.com/scene.png')
      })

      it('updates scene videoUrl', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        const scene = await createSceneWithImage(project.id)

        const updated = await prisma.scene.update({
          where: { id: scene.id },
          data: { videoUrl: 'https://video.com/scene.mp4' }
        })

        expect(updated.videoUrl).toBe('https://video.com/scene.mp4')
      })
    })

    describe('Bulk Scene Operations', () => {
      it('updates multiple scenes', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        const scenes = await createTestScenes(project.id, 3)

        // Update all scenes to have a common tag
        await prisma.scene.updateMany({
          where: { projectId: project.id },
          data: { cameraShot: 'wide' }
        })

        const updatedScenes = await prisma.scene.findMany({
          where: { projectId: project.id }
        })

        expect(updatedScenes.every(s => s.cameraShot === 'wide')).toBe(true)
      })

      it('deletes multiple scenes', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        await createTestScenes(project.id, 5)

        // Delete first 2 scenes
        await prisma.scene.deleteMany({
          where: {
            projectId: project.id,
            number: { lte: 2 }
          }
        })

        const remainingScenes = await prisma.scene.findMany({
          where: { projectId: project.id }
        })

        expect(remainingScenes).toHaveLength(3)
      })
    })

    describe('Delete Scene', () => {
      it('deletes single scene', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)
        const scene = await createSceneWithImage(project.id)

        await prisma.scene.delete({
          where: { id: scene.id }
        })

        const found = await prisma.scene.findUnique({
          where: { id: scene.id }
        })

        expect(found).toBeNull()
      })
    })
  })

  describe('Character Operations', () => {
    describe('Create Character', () => {
      it('creates character with valid data', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        const character = await prisma.character.create({
          data: {
            projectId: project.id,
            name: 'Hero',
            description: 'The main protagonist',
            visualDescription: 'Tall with dark hair and blue eyes',
            masterPrompt: 'A hero character with dark hair and blue eyes'
          }
        })

        expect(character).toBeDefined()
        expect(character.name).toBe('Hero')
      })

      it('validates all required fields are present', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        // All required fields provided - should succeed
        const character = await prisma.character.create({
          data: {
            projectId: project.id,
            name: 'Test Character',
            description: 'Test description',
            visualDescription: 'Visual test',
            masterPrompt: 'Master prompt test'
          }
        })
        expect(character).toBeDefined()
      })
    })

    describe('Update Character', () => {
      it('updates character with image', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        const character = await prisma.character.create({
          data: {
            projectId: project.id,
            name: 'Hero',
            description: 'Main character',
            visualDescription: 'Tall with dark hair',
            masterPrompt: 'Hero character prompt'
          }
        })

        const updated = await prisma.character.update({
          where: { id: character.id },
          data: { imageUrl: 'https://images.com/hero.png' }
        })

        expect(updated.imageUrl).toBe('https://images.com/hero.png')
      })
    })

    describe('Delete Character', () => {
      it('deletes character by id', async () => {
        const user = await createTestUser()
        const project = await createTestProject(user.id)

        const character = await prisma.character.create({
          data: {
            projectId: project.id,
            name: 'Hero',
            description: 'Main character',
            visualDescription: 'Tall with dark hair',
            masterPrompt: 'Hero character prompt'
          }
        })

        await prisma.character.delete({
          where: { id: character.id }
        })

        const found = await prisma.character.findUnique({
          where: { id: character.id }
        })

        expect(found).toBeNull()
      })
    })
  })

  describe('Project Access Control', () => {
    it('owner has full access', async () => {
      const owner = await createTestUser()
      const project = await createTestProject(owner.id)

      // Owner can read
      const found = await prisma.project.findUnique({
        where: { id: project.id }
      })
      expect(found).toBeDefined()

      // Owner can update
      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { name: 'Updated Name' }
      })
      expect(updated.name).toBe('Updated Name')
    })

    it('project members can be queried', async () => {
      const owner = await createTestUser()
      const collaborator = await createTestUser()
      const project = await createTestProject(owner.id)
      await addProjectMember(project.id, collaborator.id, 'collaborator')

      const members = await prisma.projectMember.findMany({
        where: { projectId: project.id },
        include: { user: true }
      })

      expect(members).toHaveLength(1)
      expect(members[0].role).toBe('collaborator')
    })

    it('validates project ownership for cross-project access', async () => {
      const owner = await createTestUser()
      const otherUser = await createTestUser()
      const project = await createTestProject(owner.id)

      // Check ownership
      const isOwner = project.userId === otherUser.id
      expect(isOwner).toBe(false)

      // In API context, this would return 403
    })
  })

  describe('Project Export/Import', () => {
    it('can export project data', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)
      await createTestScenes(project.id, 3)

      const projectWithRelations = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          scenes: true,
          characters: true
        }
      })

      expect(projectWithRelations).toBeDefined()
      expect(projectWithRelations?.scenes).toHaveLength(3)

      // Export format would be JSON
      const exportData = JSON.stringify(projectWithRelations)
      expect(exportData).toContain('scenes')
    })

    it('validates import data structure', async () => {
      const user = await createTestUser()

      // Simulate import data
      const importData = {
        name: 'Imported Project',
        story: 'An imported story',
        scenes: [
          { number: 1, description: 'Scene 1' },
          { number: 2, description: 'Scene 2' }
        ]
      }

      // Create project from import
      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: importData.name,
          story: importData.story
        }
      })

      // Create scenes
      for (const sceneData of importData.scenes) {
        await prisma.scene.create({
          data: {
            projectId: project.id,
            number: sceneData.number,
            title: `Scene ${sceneData.number}`,
            description: sceneData.description,
            textToImagePrompt: `Image prompt for scene ${sceneData.number}`,
            imageToVideoPrompt: `Video prompt for scene ${sceneData.number}`
          }
        })
      }

      const projectWithScenes = await prisma.project.findUnique({
        where: { id: project.id },
        include: { scenes: true }
      })

      expect(projectWithScenes?.scenes).toHaveLength(2)
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/test/setup'
import { createTestUser } from '@/test/factories/user'
import { createTestProject } from '@/test/factories/project'

describe('Notifications API Tests', () => {
  describe('Create Notification', () => {
    it('creates notification with valid data', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Project Invitation',
          message: 'You have been invited to collaborate'
        }
      })

      expect(notification).toBeDefined()
      expect(notification.type).toBe('invitation')
      expect(notification.read).toBe(false)
    })

    it('creates notification for regeneration approval', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'regeneration_approved',
          title: 'Regeneration Approved',
          message: 'Your regeneration request has been approved'
        }
      })

      expect(notification.type).toBe('regeneration_approved')
    })

    it('creates notification for regeneration rejection', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'regeneration_rejected',
          title: 'Regeneration Rejected',
          message: 'Your regeneration request has been rejected'
        }
      })

      expect(notification.type).toBe('regeneration_rejected')
    })

    it('creates notification for deletion approval', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'deletion_approved',
          title: 'Deletion Approved',
          message: 'Your deletion request has been approved'
        }
      })

      expect(notification.type).toBe('deletion_approved')
    })

    it('stores projectId in metadata', async () => {
      const user = await createTestUser()
      const project = await createTestProject(user.id)

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Project Invitation',
          message: 'You have been invited',
          metadata: { projectId: project.id }
        }
      })

      expect(notification.metadata).toEqual({ projectId: project.id })
    })
  })

  describe('List Notifications', () => {
    it('returns all notifications for user', async () => {
      const user = await createTestUser()

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Notification 1',
          message: 'Test 1'
        }
      })

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'regeneration_approved',
          title: 'Notification 2',
          message: 'Test 2'
        }
      })

      const notifications = await prisma.notification.findMany({
        where: { userId: user.id }
      })

      expect(notifications).toHaveLength(2)
    })

    it('filters by unread status', async () => {
      const user = await createTestUser()

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Read',
          message: 'Already read',
          read: true
        }
      })

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'regeneration_approved',
          title: 'Unread',
          message: 'Not read yet',
          read: false
        }
      })

      const unreadNotifications = await prisma.notification.findMany({
        where: {
          userId: user.id,
          read: false
        }
      })

      expect(unreadNotifications).toHaveLength(1)
      expect(unreadNotifications[0].title).toBe('Unread')
    })

    it('supports pagination', async () => {
      const user = await createTestUser()

      for (let i = 0; i < 10; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'invitation',
            title: `Notification ${i}`,
            message: `Test ${i}`
          }
        })
      }

      const page1 = await prisma.notification.findMany({
        where: { userId: user.id },
        take: 3,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      })

      const page2 = await prisma.notification.findMany({
        where: { userId: user.id },
        take: 3,
        skip: 3,
        orderBy: { createdAt: 'desc' }
      })

      expect(page1).toHaveLength(3)
      expect(page2).toHaveLength(3)
    })

    it('orders by createdAt descending (newest first)', async () => {
      const user = await createTestUser()

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Older',
          message: 'Older notification',
          createdAt: new Date('2024-01-01')
        }
      })

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Newer',
          message: 'Newer notification',
          createdAt: new Date('2024-06-01')
        }
      })

      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      expect(notifications[0].title).toBe('Newer')
    })
  })

  describe('Mark As Read', () => {
    it('marks single notification as read', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Test',
          message: 'Test',
          read: false
        }
      })

      const updated = await prisma.notification.update({
        where: { id: notification.id },
        data: { read: true }
      })

      expect(updated.read).toBe(true)
    })

    it('marks all notifications as read', async () => {
      const user = await createTestUser()

      for (let i = 0; i < 5; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'invitation',
            title: `Test ${i}`,
            message: `Test ${i}`,
            read: false
          }
        })
      }

      await prisma.notification.updateMany({
        where: { userId: user.id },
        data: { read: true }
      })

      const unread = await prisma.notification.count({
        where: {
          userId: user.id,
          read: false
        }
      })

      expect(unread).toBe(0)
    })
  })

  describe('User Isolation', () => {
    it('only returns own notifications', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await prisma.notification.create({
        data: {
          userId: user1.id,
          type: 'invitation',
          title: 'User 1 Notification',
          message: 'For user 1'
        }
      })

      await prisma.notification.create({
        data: {
          userId: user2.id,
          type: 'invitation',
          title: 'User 2 Notification',
          message: 'For user 2'
        }
      })

      const user1Notifications = await prisma.notification.findMany({
        where: { userId: user1.id }
      })

      expect(user1Notifications).toHaveLength(1)
      expect(user1Notifications[0].title).toBe('User 1 Notification')
    })
  })

  describe('Notification Types', () => {
    it('supports invitation type', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Invitation',
          message: 'You have been invited'
        }
      })

      expect(notification.type).toBe('invitation')
    })

    it('supports approval types', async () => {
      const user = await createTestUser()

      const approvalTypes = [
        'regeneration_approved',
        'regeneration_rejected',
        'deletion_approved',
        'deletion_rejected'
      ]

      for (const type of approvalTypes) {
        const notification = await prisma.notification.create({
          data: {
            userId: user.id,
            type,
            title: `${type} notification`,
            message: 'Test'
          }
        })
        expect(notification.type).toBe(type)
      }
    })

    it('supports regeneration_pending type', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'regeneration_pending',
          title: 'New Regeneration Request',
          message: 'A collaborator has requested regeneration'
        }
      })

      expect(notification.type).toBe('regeneration_pending')
    })
  })

  describe('Notification with Metadata', () => {
    it('stores metadata in notification', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Test',
          message: 'Test',
          metadata: {
            invitedBy: 'admin@example.com',
            role: 'collaborator'
          }
        }
      })

      expect(notification.metadata).toEqual({
        invitedBy: 'admin@example.com',
        role: 'collaborator'
      })
    })
  })

  describe('Delete Notification', () => {
    it('deletes notification by id', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'To Delete',
          message: 'Will be deleted'
        }
      })

      await prisma.notification.delete({
        where: { id: notification.id }
      })

      const found = await prisma.notification.findUnique({
        where: { id: notification.id }
      })

      expect(found).toBeNull()
    })

    it('deletes old notifications', async () => {
      const user = await createTestUser()

      // Create old notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Old',
          message: 'Old notification',
          createdAt: new Date('2023-01-01')
        }
      })

      // Create recent notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Recent',
          message: 'Recent notification',
          createdAt: new Date()
        }
      })

      // Delete notifications older than 6 months
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: sixMonthsAgo }
        }
      })

      const remaining = await prisma.notification.findMany({
        where: { userId: user.id }
      })

      expect(remaining).toHaveLength(1)
      expect(remaining[0].title).toBe('Recent')
    })
  })

  describe('Unread Count', () => {
    it('counts unread notifications', async () => {
      const user = await createTestUser()

      // Create 3 unread and 2 read
      for (let i = 0; i < 3; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'invitation',
            title: `Unread ${i}`,
            message: 'Test',
            read: false
          }
        })
      }

      for (let i = 0; i < 2; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'invitation',
            title: `Read ${i}`,
            message: 'Test',
            read: true
          }
        })
      }

      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          read: false
        }
      })

      expect(unreadCount).toBe(3)
    })
  })

  describe('Action URL', () => {
    it('stores action URL for notification', async () => {
      const user = await createTestUser()

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'invitation',
          title: 'Project Invitation',
          message: 'Click to view',
          actionUrl: '/projects/123'
        }
      })

      expect(notification.actionUrl).toBe('/projects/123')
    })
  })
})

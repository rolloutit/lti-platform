import { CLIENT_ID } from './config.js'

// In-memory data of the mini-LMS. Ids are strings already here, because `sub`, `login_hint` and
// `resource_link.id` are strings in the launch.

export type User = {
  id: string
  username: string
  name: string
  givenName: string
  familyName: string
  email: string
}

export type Course = {
  id: string
  label: string
  title: string
}

export type Membership = {
  courseId: string
  userId: string
  roles: string[]
}

export type Link = {
  id: string
  courseId: string
  title: string
  clientId: string
  deploymentId: string
}

export const INSTRUCTOR = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'
export const LEARNER = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'

export const users: User[] = [
  {
    id: '1',
    username: 'teacher',
    name: 'Tom Teacher',
    givenName: 'Tom',
    familyName: 'Teacher',
    email: 'tom.teacher@example.com',
  },
  {
    id: '2',
    username: 'student',
    name: 'Sam Student',
    givenName: 'Sam',
    familyName: 'Student',
    email: 'sam.student@example.com',
  },
]

export const courses: Course[] = [{ id: '101', label: 'LTI 101', title: 'LTI 101 – PoC course' }]

export const memberships: Membership[] = [
  { courseId: '101', userId: '1', roles: [INSTRUCTOR] },
  { courseId: '101', userId: '2', roles: [LEARNER] },
]

export const links: Link[] = [
  { id: '1', courseId: '101', title: 'Weekly quiz', clientId: CLIENT_ID, deploymentId: '1' },
]

export const findUser = (id: string) => users.find((user) => user.id === id)

export const findUserByUsername = (username: string) =>
  users.find((user) => user.username === username)

export const findCourse = (id: string) => courses.find((course) => course.id === id)

export const findMembership = (courseId: string, userId: string) =>
  memberships.find((m) => m.courseId === courseId && m.userId === userId)

export const coursesOfUser = (userId: string) =>
  courses.filter((course) => findMembership(course.id, userId))

export const linksOfCourse = (courseId: string) =>
  links.filter((link) => link.courseId === courseId)

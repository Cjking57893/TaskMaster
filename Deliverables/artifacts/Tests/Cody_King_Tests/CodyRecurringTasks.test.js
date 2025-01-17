const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../index');
const TodoTask = require('../models/TodoTask');
const UserData = require('../models/UserData');
const testUsername = 'test@test.com';
const testPassword = 'password123!!';

describe('Test Suite for Recurring Tasks', () => {
    let agent;

    beforeEach(async () => {
        agent = request.agent(app);
        await agent.post('/create-account').send({ username: testUsername, password: testPassword });
        await agent.post('/login').send({ username: testUsername, password: testPassword });
    });

    afterEach(async () => {
        await UserData.findOneAndDelete({ username: testUsername });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await server.close();
    });

    describe('Recurring Task Interval Display', () => {
        it('should display the task only if the current date is past or on the specific interval', async () => {
            const testDate = new Date();
            const startDate = new Date().toISOString();
            const millisecondsPerDay = 86400000;
            // Creating task that will repeat every 3 days
            const recurringTask = new TodoTask({title: 'Recurring Task with Interval', date: testDate, user: testUsername, isRecurring: true, recurrence: {frequency: 'daily', interval: 3, startBy: startDate, endBy: null, isPaused: false}});
            await recurringTask.save();
    
            // Rendering page with tasks on it
            let response = await agent.get('/');
    
            // Checking if task made earlier is showing up on page
            expect(response.text).toContain('Recurring Task with Interval');
    
            // Marking task as completed for this specific interval
            await agent.patch(`/complete/${recurringTask._id}`);
    
            jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date());
            // Advancing time by a day
            jest.advanceTimersByTime(millisecondsPerDay);
    
            // Calling new response to check if task showing up
            response = await agent.get('/');
    
            // Checking if task made earlier is not showing up
            expect(response.text).not.toContain('Recurring Task with Interval');
    
            // Advancing time by two days
            jest.advanceTimersByTime(millisecondsPerDay * 2);
    
            // Calling new response to check if task showing up
            response = await agent.get('/');
    
            // Checking if task made earlier is showing up since it has been 3 days
            expect(response.text).toContain('Recurring Task with Interval');
            
            // Deleting test documents from database
            await TodoTask.findByIdAndDelete(recurringTask._id);
        });
    });
    
    describe('Recurring Task Start By and End By Date', () => {
        it('should only show the task if it is on or past the start by date and should not show if past end by date', async () => {
            jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(new Date());
            const currentDate = new Date();
            const millisecondsPerDay = 86400000;
            const millisecondsPerWeek = millisecondsPerDay * 7;
            const startDate = new Date(currentDate.getTime() + millisecondsPerWeek);
            const endDate = new Date(startDate.getTime() + millisecondsPerWeek);
            // Creating task with a startby date and endby date
            const recurringTask = new TodoTask({title: 'Recurring Task with Startby and Endby dates', date: currentDate, user: testUsername, isRecurring: true, recurrence: {frequency: 'daily', interval: 3, startBy: startDate, endBy: endDate, isPaused: false}});
            await recurringTask.save();
    
            // Rendering page with tasks on it
            let response = await agent.get('/');
    
            // Checking if task made earlier is not showing up on page since it is not start date yet
            expect(response.text).not.toContain('Recurring Task with Startby and Endby dates');
    
            // Advancing time by week
            jest.advanceTimersByTime(millisecondsPerWeek);
    
            // Calling new response to check if task showing up
            response = await agent.get('/');
    
            // Checking is task made earlier is showing up on page since it is past start date
            expect(response.text).toContain('Recurring Task with Startby and Endby dates');
    
            // Advancing time by week
            jest.advanceTimersByTime(millisecondsPerWeek);
    
            // Calling new response to check if task showing up
            response = await agent.get('/');
    
            // Checking if task made earlier is not showing up on page since it is past end date
            expect(response.text).not.toContain('Recurring Task with Startby and Endby dates');
    
            // Deleting test documents from database
            await TodoTask.findByIdAndDelete(recurringTask._id);
        });
    });
});

#!/usr/bin/env node

/**
 * Test script to verify TDD Guard configuration
 */

const fs = require('fs');
const path = require('path');

console.log('Testing TDD Guard Configuration for Admin3 Project\n');
console.log('='.repeat(60));

// Check if tdd-guard is installed globally
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testConfiguration() {
    try {
        // 1. Check global installation
        console.log('\n1. Checking tdd-guard global installation...');
        try {
            const { stdout } = await execPromise('npm list -g tdd-guard');
            console.log('✅ tdd-guard is installed globally');
        } catch (error) {
            console.log('❌ tdd-guard is not installed globally');
            console.log('   Run: npm install -g tdd-guard');
            return;
        }

        // 2. Check configuration files
        console.log('\n2. Checking configuration files...');
        const configs = [
            'tdd-guard.config.js',
            'backend/django_Admin3/tdd-guard.config.js',
            'frontend/react-Admin3/tdd-guard.config.js'
        ];

        for (const config of configs) {
            const fullPath = path.join(__dirname, config);
            if (fs.existsSync(fullPath)) {
                console.log(`✅ Found: ${config}`);
            } else {
                console.log(`❌ Missing: ${config}`);
            }
        }

        // 3. Check backend Python configuration
        console.log('\n3. Checking backend Python configuration...');
        const pyprojectPath = path.join(__dirname, 'backend/django_Admin3/pyproject.toml');
        if (fs.existsSync(pyprojectPath)) {
            const content = fs.readFileSync(pyprojectPath, 'utf8');
            if (content.includes('[tool.tdd-guard]')) {
                console.log('✅ Backend pyproject.toml has TDD guard configuration');
            } else {
                console.log('❌ Backend pyproject.toml missing TDD guard configuration');
            }
        }

        // 4. Check frontend Jest configuration
        console.log('\n4. Checking frontend Jest configuration...');
        const frontendPackagePath = path.join(__dirname, 'frontend/react-Admin3/package.json');
        if (fs.existsSync(frontendPackagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
            if (packageJson.devDependencies && packageJson.devDependencies['tdd-guard-jest']) {
                console.log('✅ Frontend has tdd-guard-jest installed');
            } else {
                console.log('❌ Frontend missing tdd-guard-jest');
            }
        }

        // 5. Check Claude settings
        console.log('\n5. Checking Claude Code settings...');
        const claudeSettingsPath = path.join(__dirname, '.claude/settings.json');
        const claudeLocalSettingsPath = path.join(__dirname, '.claude/settings.local.json');
        
        if (fs.existsSync(claudeSettingsPath)) {
            const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
            if (settings.hooks && settings.hooks.PreToolUse) {
                console.log('✅ Claude settings.json has TDD hooks configured');
            } else {
                console.log('❌ Claude settings.json missing TDD hooks');
            }
        }

        if (fs.existsSync(claudeLocalSettingsPath)) {
            const settings = JSON.parse(fs.readFileSync(claudeLocalSettingsPath, 'utf8'));
            if (settings.hooks && settings.hooks.PreToolUse) {
                console.log('✅ Claude settings.local.json has TDD hooks configured');
            } else {
                console.log('❌ Claude settings.local.json missing TDD hooks');
            }
        }

        // 6. Test Django test command
        console.log('\n6. Testing Django test command...');
        try {
            const { stdout } = await execPromise('cd backend/django_Admin3 && python manage.py test --help', { timeout: 5000 });
            console.log('✅ Django test command is available');
        } catch (error) {
            console.log('⚠️  Django test command check failed (may need virtual env activated)');
        }

        // 7. Test React test command
        console.log('\n7. Testing React test command...');
        try {
            const { stdout } = await execPromise('cd frontend/react-Admin3 && npm test -- --help', { timeout: 5000 });
            console.log('✅ React test command is available');
        } catch (error) {
            console.log('⚠️  React test command check failed');
        }

        console.log('\n' + '='.repeat(60));
        console.log('TDD Guard Configuration Test Complete!');
        console.log('\nNext steps:');
        console.log('1. The hooks are configured to run automatically when you use Write, Edit, or MultiEdit tools');
        console.log('2. TDD enforcement will block implementation without failing tests');
        console.log('3. Coverage requirements are set to 80% minimum');
        console.log('\nTo test enforcement manually:');
        console.log('- Try to create a new feature without a test');
        console.log('- The hook should block the operation and request a test first');

    } catch (error) {
        console.error('Error during configuration test:', error.message);
    }
}

testConfiguration();
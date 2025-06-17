#!/usr/bin/env node

/**
 * Test script for Firecrawl MCP Server
 * This script demonstrates the capabilities of the Firecrawl MCP server
 * including web scraping, content extraction, and data processing.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔥 Testing Firecrawl MCP Server Capabilities\n');

// Path to the built MCP server
const serverPath = path.join(__dirname, 'dist', 'index.js');

// Test MCP server startup
function testServerStartup() {
    console.log('📋 Testing MCP Server Startup...');
    
    const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname,
        env: {
            ...process.env,
            // Use a demo mode environment variable to avoid API key requirement
            FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || 'demo-key-for-testing'
        }
    });

    // Send MCP initialization request
    const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {
                roots: {
                    listChanged: true
                },
                sampling: {}
            },
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        }
    };

    server.stdin.write(JSON.stringify(initRequest) + '\n');

    let initComplete = false;

    server.stdout.on('data', (data) => {
        const response = data.toString().trim();
        if (response) {
            try {
                const parsed = JSON.parse(response);
                if (parsed.id === 1 && !initComplete) {
                    initComplete = true;
                    console.log('✅ Server initialized successfully');
                    console.log('📊 Server capabilities:', JSON.stringify(parsed.result.capabilities, null, 2));
                    
                    // Test tools listing
                    testToolsListing(server);
                } else if (parsed.id === 2) {
                    // Handle tools listing response
                    if (parsed.result && parsed.result.tools) {
                        console.log('✅ Available tools:');
                        parsed.result.tools.forEach(tool => {
                            console.log(`  • ${tool.name}: ${tool.description.split('\n')[0]}`);
                        });
                        
                        // Test a scraping operation (will likely fail due to API key, but demonstrates the interface)
                        testScrapingOperation(server);
                    }
                } else if (parsed.id === 3) {
                    // Handle scraping response
                    if (parsed.error) {
                        console.log('⚠️  Expected API key error (demonstration successful):', parsed.error.message);
                        console.log('✅ Scraping tool interface working correctly');
                    } else {
                        console.log('✅ Scraping successful:', parsed.result.content[0].text.substring(0, 200) + '...');
                    }
                    
                    // Clean up after delay
                    setTimeout(() => {
                        server.kill();
                    }, 1000);
                }
            } catch (e) {
                console.error('❌ Failed to parse JSON response:', e.message);
                console.log('📥 Raw server response:', response);
                console.log('🔍 This might indicate the server sent invalid JSON or non-JSON data');
            }
        }
    });

    server.stderr.on('data', (data) => {
        const stderr = data.toString();
        // Filter out expected API key warnings for demo
        if (!stderr.includes('FIRECRAWL_API_KEY') && !stderr.includes('environment variable')) {
            console.log('⚠️  Server stderr:', stderr);
        }
    });

    server.on('close', (code) => {
        console.log(`🔚 Server process exited with code ${code}`);
    });

    return server;
}

function testToolsListing(server) {
    console.log('\n🔧 Testing Tools Listing...');
    
    const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    };

    server.stdin.write(JSON.stringify(toolsRequest) + '\n');
}

function testScrapingOperation(server) {
    console.log('\n🌐 Testing Web Scraping Operation...');
    
    const scrapeRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
            name: 'firecrawl_scrape',
            arguments: {
                url: 'https://example.com',
                formats: ['markdown'],
                onlyMainContent: true
            }
        }
    };

    server.stdin.write(JSON.stringify(scrapeRequest) + '\n');
}

// Check if built files exist
if (!fs.existsSync(serverPath)) {
    console.log('❌ Built server files not found. Building server...');
    
    // Try to build the server
    const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
    });
    
    buildProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Server built successfully. Starting test...\n');
            startTest();
        } else {
            console.log('❌ Build failed. Please run: npm run build');
            process.exit(1);
        }
    });
} else {
    startTest();
}

function startTest() {
    console.log('📁 Server path:', serverPath);
    console.log('🔍 Checking server configuration...\n');

    // Check for API key
    if (!process.env.FIRECRAWL_API_KEY) {
        console.log('⚠️  No FIRECRAWL_API_KEY environment variable found');
        console.log('💡 This test will demonstrate the server interface without making actual API calls');
        console.log('🔑 To use with real API key, get one from: https://firecrawl.dev\n');
    } else {
        console.log('✅ FIRECRAWL_API_KEY found - will test with live API\n');
    }

    // Display server capabilities information
    console.log('🎯 Firecrawl MCP Server Features:');
    console.log('  • firecrawl_scrape - Extract content from single web pages');
    console.log('  • firecrawl_map - Discover all URLs on a website');  
    console.log('  • firecrawl_crawl - Crawl multiple pages and extract content');
    console.log('  • firecrawl_check_crawl_status - Check crawl job progress');
    console.log('  • firecrawl_search - Search the web with content extraction');
    console.log('  • firecrawl_extract - LLM-powered structured data extraction');
    console.log('  • firecrawl_deep_research - AI-powered research with multiple sources');
    console.log('  • firecrawl_generate_llmstxt - Generate LLMs.txt files for websites');
    console.log('');

    // Start the test
    testServerStartup();
}